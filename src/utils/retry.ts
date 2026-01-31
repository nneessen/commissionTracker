// src/utils/retry.ts
// Retry logic for handling transient failures

import { logger } from "../services/base/logger";

/** Error constructor type - allows any Error subclass */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Error subclass constructors have varying signatures
type ErrorConstructor = new (...args: any[]) => Error;

export interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  backoffMultiplier?: number;
  maxDelayMs?: number;
  retryableErrors?: ErrorConstructor[];
  onRetry?: (attempt: number, error: Error) => void;
}

const DEFAULT_OPTIONS: Required<
  Omit<RetryOptions, "retryableErrors" | "onRetry">
> = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
  maxDelayMs: 10000,
};

/**
 * Determines if an error is retryable
 */

function isRetryable(
  error: unknown,
  retryableErrors?: ErrorConstructor[],
): boolean {
  if (!retryableErrors || retryableErrors.length === 0) {
    // By default, retry on network errors and 5xx server errors
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes("network") ||
        message.includes("timeout") ||
        message.includes("connection") ||
        message.includes("econnrefused") ||
        message.includes("enotfound") ||
        message.includes("failed to fetch") ||
        message.includes("50") // 500-level errors
      );
    }
    return false;
  }

  // Check if error matches any of the specified retryable error types
  return retryableErrors.some((ErrorClass) => error instanceof ErrorClass);
}

/**
 * Calculate delay with exponential backoff
 */
function calculateDelay(
  attempt: number,
  baseDelay: number,
  multiplier: number,
  maxDelay: number,
): number {
  const delay = baseDelay * Math.pow(multiplier, attempt - 1);
  return Math.min(delay, maxDelay);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry an async operation with exponential backoff
 *
 * @example
 * ```typescript
 * const result = await withRetry(
 *   () => fetchData(),
 *   { maxAttempts: 3, delayMs: 1000 }
 * );
 * ```
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // If it's the last attempt or error is not retryable, throw immediately
      if (
        attempt === opts.maxAttempts ||
        !isRetryable(error, options.retryableErrors)
      ) {
        throw lastError;
      }

      // Calculate delay and notify about retry
      const delay = calculateDelay(
        attempt,
        opts.delayMs,
        opts.backoffMultiplier,
        opts.maxDelayMs,
      );

      logger.warn(`Retry attempt ${attempt}/${opts.maxAttempts}`, {
        error: lastError.message,
        nextRetryIn: delay,
        operation: operation.name || "anonymous",
      });

      // Call onRetry callback if provided
      options.onRetry?.(attempt, lastError);

      // Wait before retrying
      await sleep(delay);
    }
  }

  // This should never be reached due to throw in loop, but TypeScript needs it
  throw lastError!;
}

/**
 * Decorator for retry logic (for class methods)
 *
 * @example
 * ```typescript
 * class MyService {
 *   @Retry({ maxAttempts: 3 })
 *   async fetchData() {
 *     // operation
 *   }
 * }
 * ```
 */
export function Retry(options: RetryOptions = {}) {
  return function (
    _target: object,
    _propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      return withRetry(() => originalMethod.apply(this, args), options);
    };

    return descriptor;
  };
}

/**
 * Circuit breaker pattern for preventing cascading failures
 */
export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime?: Date;
  private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";

  constructor(
    private readonly threshold: number = 5,
    private readonly resetTimeoutMs: number = 60000,
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      if (this.shouldAttemptReset()) {
        this.state = "HALF_OPEN";
      } else {
        throw new Error("Circuit breaker is OPEN");
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return false;
    const timeSinceLastFailure = Date.now() - this.lastFailureTime.getTime();
    return timeSinceLastFailure >= this.resetTimeoutMs;
  }

  private onSuccess() {
    this.failureCount = 0;
    this.state = "CLOSED";
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = new Date();

    if (this.failureCount >= this.threshold) {
      this.state = "OPEN";
      logger.error("Circuit breaker opened", {
        failureCount: this.failureCount,
        threshold: this.threshold,
      });
    }
  }

  getState(): "CLOSED" | "OPEN" | "HALF_OPEN" {
    return this.state;
  }

  reset() {
    this.failureCount = 0;
    this.state = "CLOSED";
    this.lastFailureTime = undefined;
  }
}
