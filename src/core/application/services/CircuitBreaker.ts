export enum CircuitState {
  Closed,
  Open,
  HalfOpen,
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.Closed;
  private failureCount: number = 0;
  private lastFailureTime?: number;
  private successCount: number = 0;

  constructor(
    private readonly threshold: number = 5,
    private readonly resetTimeoutMs: number = 60000,
    private readonly probeThreshold: number = 2
  ) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.Open) {
      if (Date.now() - (this.lastFailureTime || 0) > this.resetTimeoutMs) {
        this.state = CircuitState.HalfOpen;
      } else {
        throw new Error("Circuit breaker is open");
      }
    }

    try {
      const result = await fn();
      if (this.state === CircuitState.HalfOpen) {
        this.successCount++;
        if (this.successCount >= this.probeThreshold) {
          this.reset();
        }
      }
      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();
      
      if (this.state === CircuitState.Closed && this.failureCount >= this.threshold) {
        this.state = CircuitState.Open;
      } else if (this.state === CircuitState.HalfOpen) {
        this.state = CircuitState.Open;
      }
      
      throw error;
    }
  }

  private reset(): void {
    this.state = CircuitState.Closed;
    this.failureCount = 0;
    this.successCount = 0;
  }

  getState(): CircuitState {
    return this.state;
  }
}
