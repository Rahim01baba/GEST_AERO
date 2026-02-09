export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  BILLING_ERROR = 'BILLING_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface ErrorContext {
  userId?: string;
  resource?: string;
  action?: string;
  airportId?: string;
  movementId?: string;
  invoiceId?: string;
  page?: string;
  filters?: Record<string, string | number | boolean>;
  metadata?: Record<string, string | number | boolean | null>;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly cause?: unknown;
  public readonly context?: ErrorContext;
  public readonly timestamp: Date;

  constructor(
    code: ErrorCode,
    message: string,
    cause?: unknown,
    context?: ErrorContext
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.cause = cause;
    this.context = context;
    this.timestamp = new Date();

    Object.setPrototypeOf(this, AppError.prototype);
  }

  static validation(message: string, context?: ErrorContext): AppError {
    return new AppError(ErrorCode.VALIDATION_ERROR, message, undefined, context);
  }

  static notFound(resource: string, context?: ErrorContext): AppError {
    return new AppError(ErrorCode.NOT_FOUND, `${resource} introuvable`, undefined, context);
  }

  static unauthorized(message = 'Non autorisé', context?: ErrorContext): AppError {
    return new AppError(ErrorCode.UNAUTHORIZED, message, undefined, context);
  }

  static forbidden(message = 'Accès refusé', context?: ErrorContext): AppError {
    return new AppError(ErrorCode.FORBIDDEN, message, undefined, context);
  }

  static database(message: string, cause?: unknown, context?: ErrorContext): AppError {
    return new AppError(ErrorCode.DATABASE_ERROR, message, cause, context);
  }

  static network(message: string, cause?: unknown, context?: ErrorContext): AppError {
    return new AppError(ErrorCode.NETWORK_ERROR, message, cause, context);
  }

  static billing(message: string, context?: ErrorContext): AppError {
    return new AppError(ErrorCode.BILLING_ERROR, message, undefined, context);
  }

  static unknown(cause?: unknown): AppError {
    return new AppError(
      ErrorCode.UNKNOWN_ERROR,
      'Une erreur inattendue est survenue',
      cause
    );
  }
}

export function toUserMessage(err: unknown): string {
  if (err instanceof AppError) {
    return err.message;
  }

  if (err instanceof Error) {
    if (err.message.includes('JWT')) {
      return 'Session expirée. Veuillez vous reconnecter.';
    }
    if (err.message.includes('network') || err.message.includes('fetch')) {
      return 'Erreur de connexion. Vérifiez votre réseau.';
    }
    if (err.message.includes('permission') || err.message.includes('RLS')) {
      return 'Accès refusé. Vérifiez vos permissions.';
    }
    return err.message;
  }

  return 'Une erreur inattendue est survenue';
}
