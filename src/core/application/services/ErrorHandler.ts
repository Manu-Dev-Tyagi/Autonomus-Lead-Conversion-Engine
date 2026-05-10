import { ObservabilityPort } from "@/src/core/application/ports/ObservabilityPort";

export class ApplicationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = false,
    public readonly metadata: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = "ApplicationError";
  }
}

export class ErrorHandler {
  constructor(private readonly observability: ObservabilityPort) {}

  handle(error: unknown, context: string, metadata: Record<string, unknown> = {}): void {
    const errorDetails = error instanceof Error ? error.message : String(error);
    const errorCode = error instanceof ApplicationError ? error.code : "UNKNOWN_ERROR";
    const isRetryable = error instanceof ApplicationError ? error.retryable : false;

    this.observability.error(`[${context}] ${errorCode}: ${errorDetails}`, {
      ...metadata,
      errorCode,
      isRetryable,
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (!isRetryable) {
      // Logic for critical non-retryable errors (e.g., alert developers)
    }
  }
}
