export interface ObservabilityPort {
  info(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
  metric(name: string, value: number, tags?: Record<string, string>): void;
}
