export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, details?: unknown) {
    super(400, "bad_request", message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized", details?: unknown) {
    super(401, "unauthorized", message, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Forbidden", details?: unknown) {
    super(403, "forbidden", message, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, details?: unknown) {
    super(404, "not_found", message, details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(409, "conflict", message, details);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(422, "validation_error", message, details);
  }
}
