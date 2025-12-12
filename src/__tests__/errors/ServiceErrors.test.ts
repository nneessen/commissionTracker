// src/__tests__/errors/ServiceErrors.test.ts
import {describe, it, expect} from 'vitest';
import {ServiceError, NotFoundError, ValidationError, DatabaseError, CalculationError, AuthorizationError, ConflictError, ExternalServiceError, RateLimitError, BusinessLogicError, isServiceError, getErrorMessage, getErrorDetails} from '../../errors/ServiceErrors';

describe('ServiceError', () => {
  it('should create error with all properties', () => {
    const error = new ServiceError('Test error', 'TEST_CODE', 400, { foo: 'bar' });

    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_CODE');
    expect(error.statusCode).toBe(400);
    expect(error.context).toEqual({ foo: 'bar' });
    expect(error.timestamp).toBeInstanceOf(Date);
    expect(error.name).toBe('ServiceError');
  });

  it('should serialize to JSON', () => {
    const error = new ServiceError('Test error', 'TEST_CODE', 400);
    const json = error.toJSON();

    expect(json.name).toBe('ServiceError');
    expect(json.message).toBe('Test error');
    expect(json.code).toBe('TEST_CODE');
    expect(json.statusCode).toBe(400);
    expect(json.timestamp).toBeInstanceOf(Date);
  });
});

describe('NotFoundError', () => {
  it('should create with resource and identifier', () => {
    const error = new NotFoundError('Commission', '123');

    expect(error.message).toBe('Commission not found: 123');
    expect(error.code).toBe('NOT_FOUND');
    expect(error.statusCode).toBe(404);
    expect(error.context).toEqual({ resource: 'Commission', identifier: '123' });
  });

  it('should accept additional context', () => {
    const error = new NotFoundError('Policy', '456', { reason: 'deleted' });

    expect(error.context).toEqual({
      resource: 'Policy',
      identifier: '456',
      reason: 'deleted',
    });
  });
});

describe('ValidationError', () => {
  it('should create with validation errors', () => {
    const validationErrors = [
      { field: 'email', message: 'Invalid email' },
      { field: 'age', message: 'Must be positive', value: -5 },
    ];

    const error = new ValidationError('Validation failed', validationErrors);

    expect(error.message).toBe('Validation failed');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.statusCode).toBe(400);
    expect(error.validationErrors).toEqual(validationErrors);
  });
});

describe('DatabaseError', () => {
  it('should wrap original error', () => {
    const originalError = new Error('Connection refused');
    const error = new DatabaseError('insert', originalError);

    expect(error.message).toBe('Database insert failed: Connection refused');
    expect(error.code).toBe('DATABASE_ERROR');
    expect(error.statusCode).toBe(500);
    expect(error.context?.operation).toBe('insert');
    expect(error.context?.originalError).toBe('Connection refused');
  });

  it('should work without original error', () => {
    const error = new DatabaseError('select');

    expect(error.message).toBe('Database select failed');
    expect(error.context?.operation).toBe('select');
  });
});

describe('CalculationError', () => {
  it('should include calculation type and reason', () => {
    const error = new CalculationError('Commission', 'Missing comp level', { userId: '123' });

    expect(error.message).toBe('Commission calculation failed: Missing comp level');
    expect(error.code).toBe('CALCULATION_ERROR');
    expect(error.statusCode).toBe(422);
    expect(error.context).toEqual({
      calculationType: 'Commission',
      reason: 'Missing comp level',
      userId: '123',
    });
  });
});

describe('AuthorizationError', () => {
  it('should include action and resource', () => {
    const error = new AuthorizationError('delete', 'commission');

    expect(error.message).toBe('Not authorized to delete commission');
    expect(error.code).toBe('AUTHORIZATION_ERROR');
    expect(error.statusCode).toBe(403);
    expect(error.context).toEqual({ action: 'delete', resource: 'commission' });
  });
});

describe('ConflictError', () => {
  it('should include conflict details', () => {
    const error = new ConflictError('Resource already exists', 'commission-123');

    expect(error.message).toBe('Resource already exists');
    expect(error.code).toBe('CONFLICT_ERROR');
    expect(error.statusCode).toBe(409);
    expect(error.context?.conflictingResource).toBe('commission-123');
  });
});

describe('ExternalServiceError', () => {
  it('should wrap external service failures', () => {
    const originalError = new Error('Timeout');
    const error = new ExternalServiceError('CompGuideService', 'getRate', originalError);

    expect(error.message).toBe('External service CompGuideService getRate failed: Timeout');
    expect(error.code).toBe('EXTERNAL_SERVICE_ERROR');
    expect(error.statusCode).toBe(502);
    expect(error.context).toEqual({
      serviceName: 'CompGuideService',
      operation: 'getRate',
      originalError: 'Timeout',
    });
  });
});

describe('RateLimitError', () => {
  it('should include retry information', () => {
    const error = new RateLimitError('api', 60);

    expect(error.message).toBe('Rate limit exceeded for api');
    expect(error.code).toBe('RATE_LIMIT_ERROR');
    expect(error.statusCode).toBe(429);
    expect(error.context).toEqual({ resource: 'api', retryAfter: 60 });
  });
});

describe('BusinessLogicError', () => {
  it('should include business rule', () => {
    const error = new BusinessLogicError('min_premium', 'Premium must be at least $100');

    expect(error.message).toBe('Premium must be at least $100');
    expect(error.code).toBe('BUSINESS_LOGIC_ERROR');
    expect(error.statusCode).toBe(422);
    expect(error.context?.rule).toBe('min_premium');
  });
});

describe('Utility Functions', () => {
  describe('isServiceError', () => {
    it('should identify ServiceError instances', () => {
      const serviceError = new ServiceError('Test', 'CODE', 400);
      const normalError = new Error('Test');

      expect(isServiceError(serviceError)).toBe(true);
      expect(isServiceError(normalError)).toBe(false);
      expect(isServiceError('string')).toBe(false);
      expect(isServiceError(null)).toBe(false);
    });

    it('should identify subclass instances', () => {
      const notFoundError = new NotFoundError('Resource', '123');
      const validationError = new ValidationError('Invalid', []);

      expect(isServiceError(notFoundError)).toBe(true);
      expect(isServiceError(validationError)).toBe(true);
    });
  });

  describe('getErrorMessage', () => {
    it('should extract message from Error', () => {
      const error = new Error('Test message');
      expect(getErrorMessage(error)).toBe('Test message');
    });

    it('should handle string errors', () => {
      expect(getErrorMessage('Error string')).toBe('Error string');
    });

    it('should handle unknown error types', () => {
      expect(getErrorMessage({ foo: 'bar' })).toBe('Unknown error occurred');
      expect(getErrorMessage(null)).toBe('Unknown error occurred');
    });
  });

  describe('getErrorDetails', () => {
    it('should extract full details from ServiceError', () => {
      const error = new ServiceError('Test', 'CODE', 400, { foo: 'bar' });
      const details = getErrorDetails(error);

      expect(details.message).toBe('Test');
      expect(details.code).toBe('CODE');
      expect(details.statusCode).toBe(400);
      expect(details.context).toEqual({ foo: 'bar' });
      expect(details.stack).toBeDefined();
    });

    it('should handle regular Error', () => {
      const error = new Error('Test error');
      const details = getErrorDetails(error);

      expect(details.message).toBe('Test error');
      expect(details.stack).toBeDefined();
      expect(details.code).toBeUndefined();
    });

    it('should handle unknown error types', () => {
      const details = getErrorDetails('string error');

      expect(details.message).toBe('string error');
      expect(details.code).toBeUndefined();
    });
  });
});
