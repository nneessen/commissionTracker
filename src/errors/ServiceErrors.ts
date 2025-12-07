// src/errors/ServiceErrors.ts
// Custom error classes for better error handling and debugging

/**
 * Base error class for all service errors
 */
export class ServiceError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly context?: Record<string, unknown>;
  public readonly timestamp: Date;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
    this.timestamp = new Date();

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }
}

/**
 * Resource not found error (404)
 */
export class NotFoundError extends ServiceError {
  constructor(
    resource: string,
    identifier: string | number,
    context?: Record<string, unknown>,
  ) {
    super(`${resource} not found: ${identifier}`, "NOT_FOUND", 404, {
      resource,
      identifier,
      ...context,
    });
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends ServiceError {
  public readonly validationErrors: Array<{
    field: string;
    message: string;
    value?: unknown;
  }>;

  constructor(
    message: string,
    validationErrors: Array<{
      field: string;
      message: string;
      value?: unknown;
    }>,
    context?: Record<string, unknown>,
  ) {
    super(message, "VALIDATION_ERROR", 400, { validationErrors, ...context });
    this.validationErrors = validationErrors;
  }
}

/**
 * Database operation error (500)
 */
export class DatabaseError extends ServiceError {
  constructor(
    operation: string,
    originalError?: Error,
    context?: Record<string, unknown>,
  ) {
    const message = originalError
      ? `Database ${operation} failed: ${originalError.message}`
      : `Database ${operation} failed`;

    super(message, "DATABASE_ERROR", 500, {
      operation,
      originalError: originalError?.message,
      ...context,
    });
  }
}

/**
 * Calculation error (422)
 */
export class CalculationError extends ServiceError {
  constructor(
    calculationType: string,
    reason: string,
    context?: Record<string, unknown>,
  ) {
    super(
      `${calculationType} calculation failed: ${reason}`,
      "CALCULATION_ERROR",
      422,
      { calculationType, reason, ...context },
    );
  }
}

/**
 * Authorization error (403)
 */
export class AuthorizationError extends ServiceError {
  constructor(
    action: string,
    resource: string,
    context?: Record<string, unknown>,
  ) {
    super(
      `Not authorized to ${action} ${resource}`,
      "AUTHORIZATION_ERROR",
      403,
      { action, resource, ...context },
    );
  }
}

/**
 * Conflict error (409)
 */
export class ConflictError extends ServiceError {
  constructor(
    message: string,
    conflictingResource?: string,
    context?: Record<string, unknown>,
  ) {
    super(message, "CONFLICT_ERROR", 409, { conflictingResource, ...context });
  }
}

/**
 * External service error (502)
 */
export class ExternalServiceError extends ServiceError {
  constructor(
    serviceName: string,
    operation: string,
    originalError?: Error,
    context?: Record<string, unknown>,
  ) {
    const message = originalError
      ? `External service ${serviceName} ${operation} failed: ${originalError.message}`
      : `External service ${serviceName} ${operation} failed`;

    super(message, "EXTERNAL_SERVICE_ERROR", 502, {
      serviceName,
      operation,
      originalError: originalError?.message,
      ...context,
    });
  }
}

/**
 * Rate limit error (429)
 */
export class RateLimitError extends ServiceError {
  constructor(
    resource: string,
    retryAfter?: number,
    context?: Record<string, unknown>,
  ) {
    super(`Rate limit exceeded for ${resource}`, "RATE_LIMIT_ERROR", 429, {
      resource,
      retryAfter,
      ...context,
    });
  }
}

/**
 * Business logic error (422)
 */
export class BusinessLogicError extends ServiceError {
  constructor(
    rule: string,
    message: string,
    context?: Record<string, unknown>,
  ) {
    super(message, "BUSINESS_LOGIC_ERROR", 422, { rule, ...context });
  }
}

/**
 * Type guard to check if error is a ServiceError
 */
export function isServiceError(error: unknown): error is ServiceError {
  return error instanceof ServiceError;
}

/**
 * Extract error message safely from any error type
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Unknown error occurred";
}

/**
 * Extract error details for logging
 */
export function getErrorDetails(error: unknown): {
  message: string;
  code?: string;
  statusCode?: number;
  context?: Record<string, unknown>;
  stack?: string;
} {
  if (isServiceError(error)) {
    return {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      context: error.context,
      stack: error.stack,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    message: getErrorMessage(error),
  };
}
