export interface RetryOptions {
  readonly maxAttempts: number;
  readonly baseDelayMs: number;
}

export class RetryExecutor {
  async run<T>(operation: () => Promise<T>, options: RetryOptions): Promise<T> {
    let attempt = 0;
    let lastError: unknown;

    while (attempt < options.maxAttempts) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        attempt += 1;
        if (attempt >= options.maxAttempts) {
          break;
        }
        const jitter = Math.floor(Math.random() * 25);
        const delay = options.baseDelayMs * attempt + jitter;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }
}
