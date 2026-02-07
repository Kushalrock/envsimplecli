/**
 * Structured error handling for EnvSimple CLI
 */

export class CLIError extends Error {
  constructor(
    message: string,
    public code: string,
    public exitCode: number = 1,
    public details?: any
  ) {
    super(message);
    this.name = 'CLIError';
  }
}

export class AuthenticationError extends CLIError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTHENTICATION_REQUIRED', 1);
  }
}

export class ConfigurationError extends CLIError {
  constructor(message: string) {
    super(message, 'CONFIGURATION_ERROR', 1);
  }
}

export class APIError extends CLIError {
  constructor(message: string, code: string, statusCode?: number, details?: any) {
    super(message, code, 1, details);
    this.statusCode = statusCode;
  }

  statusCode?: number;
}

export class ValidationError extends CLIError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 1, details);
  }
}

export class ConflictError extends CLIError {
  constructor(message: string, details?: any) {
    super(message, 'CONFLICT', 1, details);
  }
}

export class NotFoundError extends CLIError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 1);
  }
}

export class PermissionError extends CLIError {
  constructor(message: string = 'Permission denied') {
    super(message, 'PERMISSION_DENIED', 1);
  }
}

/**
 * Handle API response errors
 */
export function handleAPIError(response: Response, body?: any): never {
  const status = response.status;
  const error = body?.error || 'unknown_error';
  const message = body?.message || response.statusText || 'An error occurred';

  if (status === 401) {
    throw new AuthenticationError(message);
  }

  if (status === 403) {
    throw new PermissionError(message);
  }

  if (status === 404) {
    throw new NotFoundError(message);
  }

  if (status === 409) {
    throw new ConflictError(message, body?.details);
  }

  if (status === 400) {
    throw new ValidationError(message, body?.details);
  }

  throw new APIError(message, error, status, body?.details);
}

/**
 * Format error for display
 */
export function formatError(error: Error, debug: boolean = false): string {
  if (error instanceof CLIError) {
    let message = error.message;
    
    if (debug && error.details) {
      message += '\n\nDetails: ' + JSON.stringify(error.details, null, 2);
    }
    
    if (debug && error.stack) {
      message += '\n\nStack trace:\n' + error.stack;
    }
    
    return message;
  }

  if (debug && error.stack) {
    return error.message + '\n\nStack trace:\n' + error.stack;
  }

  return error.message;
}
