// src/__tests__/utils/retry.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { withRetry, CircuitBreaker } from '../../utils/retry';

describe('withRetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should succeed on first try', async () => {
    const operation = vi.fn(async () => 'success');

    const result = await withRetry(operation, { maxAttempts: 3 });

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and eventually succeed', async () => {
    let attempts = 0;
    const operation = vi.fn(async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error('network timeout');
      }
      return 'success';
    });

    const result = await withRetry(operation, { maxAttempts: 3, delayMs: 10 });

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('should throw after max attempts', async () => {
    const operation = vi.fn(async () => {
      throw new Error('network timeout');
    });

    await expect(
      withRetry(operation, { maxAttempts: 3, delayMs: 10 })
    ).rejects.toThrow('network timeout');

    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('should use exponential backoff', async () => {
    const operation = vi.fn(async () => {
      throw new Error('network timeout');
    });

    const start = Date.now();

    try {
      await withRetry(operation, {
        maxAttempts: 3,
        delayMs: 50,
        backoffMultiplier: 2,
      });
    } catch {
      // Expected to fail
    }

    const elapsed = Date.now() - start;

    // Should take at least 50ms + 100ms = 150ms total
    expect(elapsed).toBeGreaterThanOrEqual(140);
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('should respect max delay', async () => {
    const delays: number[] = [];
    let lastTime = Date.now();

    const operation = vi.fn(async () => {
      const now = Date.now();
      if (delays.length > 0) {
        delays.push(now - lastTime);
      }
      lastTime = now;
      throw new Error('Fail');
    });

    try {
      await withRetry(operation, {
        maxAttempts: 4,
        delayMs: 100,
        backoffMultiplier: 10,
        maxDelayMs: 150,
      });
    } catch {
      // Expected to fail
    }

    // All delays should be capped at maxDelayMs
    delays.forEach(delay => {
      expect(delay).toBeLessThan(200);
    });
  });

  it('should call onRetry callback', async () => {
    const onRetry = vi.fn();
    let attempts = 0;

    const operation = vi.fn(async () => {
      attempts++;
      if (attempts < 2) {
        throw new Error('network timeout');
      }
      return 'success';
    });

    await withRetry(operation, {
      maxAttempts: 3,
      delayMs: 10,
      onRetry,
    });

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
  });

  it('should not retry non-retryable errors', async () => {
    const operation = vi.fn(async () => {
      throw new Error('Non-retryable');
    });

    class NonRetryableError extends Error {}

    await expect(
      withRetry(operation, {
        maxAttempts: 3,
        retryableErrors: [NonRetryableError],
      })
    ).rejects.toThrow('Non-retryable');

    // Should fail immediately, not retry
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry only specified error types', async () => {
    class RetryableError extends Error {}
    let attempts = 0;

    const operation = vi.fn(async () => {
      attempts++;
      if (attempts < 3) {
        throw new RetryableError('Retry this');
      }
      return 'success';
    });

    const result = await withRetry(operation, {
      maxAttempts: 3,
      delayMs: 10,
      retryableErrors: [RetryableError],
    });

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(3);
  });
});

describe('CircuitBreaker', () => {
  it('should allow operations when closed', async () => {
    const breaker = new CircuitBreaker(3, 1000);
    const operation = vi.fn(async () => 'success');

    const result = await breaker.execute(operation);

    expect(result).toBe('success');
    expect(breaker.getState()).toBe('CLOSED');
  });

  it('should open after threshold failures', async () => {
    const breaker = new CircuitBreaker(3, 1000);
    const operation = vi.fn(async () => {
      throw new Error('Failure');
    });

    // Fail 3 times to open circuit
    for (let i = 0; i < 3; i++) {
      try {
        await breaker.execute(operation);
      } catch {
        // Expected
      }
    }

    expect(breaker.getState()).toBe('OPEN');

    // Next attempt should fail immediately without calling operation
    const callCount = operation.mock.calls.length;
    await expect(breaker.execute(operation)).rejects.toThrow('Circuit breaker is OPEN');
    expect(operation).toHaveBeenCalledTimes(callCount); // Not called again
  });

  it('should transition to half-open after timeout', async () => {
    const breaker = new CircuitBreaker(2, 100);
    const operation = vi.fn(async () => {
      throw new Error('Failure');
    });

    // Open the circuit
    for (let i = 0; i < 2; i++) {
      try {
        await breaker.execute(operation);
      } catch {
        // Expected
      }
    }

    expect(breaker.getState()).toBe('OPEN');

    // Wait for reset timeout
    await new Promise(resolve => setTimeout(resolve, 150));

    // Next attempt should try again (half-open)
    const successOperation = vi.fn(async () => 'success');
    await breaker.execute(successOperation);

    expect(breaker.getState()).toBe('CLOSED');
    expect(successOperation).toHaveBeenCalledTimes(1);
  });

  it('should reset failure count on success', async () => {
    const breaker = new CircuitBreaker(3, 1000);
    let shouldFail = true;

    const operation = vi.fn(async () => {
      if (shouldFail) {
        throw new Error('Failure');
      }
      return 'success';
    });

    // Fail twice
    for (let i = 0; i < 2; i++) {
      try {
        await breaker.execute(operation);
      } catch {
        // Expected
      }
    }

    // Succeed once
    shouldFail = false;
    await breaker.execute(operation);

    expect(breaker.getState()).toBe('CLOSED');

    // Fail twice more - should not open (reset)
    shouldFail = true;
    for (let i = 0; i < 2; i++) {
      try {
        await breaker.execute(operation);
      } catch {
        // Expected
      }
    }

    expect(breaker.getState()).toBe('CLOSED');
  });

  it('should manually reset', async () => {
    const breaker = new CircuitBreaker(2, 1000);
    const operation = vi.fn(async () => {
      throw new Error('Failure');
    });

    // Open the circuit
    for (let i = 0; i < 2; i++) {
      try {
        await breaker.execute(operation);
      } catch {
        // Expected
      }
    }

    expect(breaker.getState()).toBe('OPEN');

    breaker.reset();

    expect(breaker.getState()).toBe('CLOSED');

    // Should work again
    const successOperation = vi.fn(async () => 'success');
    await breaker.execute(successOperation);
    expect(successOperation).toHaveBeenCalled();
  });
});
