import { ObservabilityPort } from "@/src/core/application/ports/ObservabilityPort";

export class ConsoleObservabilityAdapter implements ObservabilityPort {
  info(message: string, data?: Record<string, unknown>): void {
    console.info("[ALE]", message, data ?? {});
  }

  error(message: string, data?: Record<string, unknown>): void {
    console.error("[ALE]", message, data ?? {});
  }

  metric(name: string, value: number, tags?: Record<string, string>): void {
    console.info("[ALE_METRIC]", name, value, tags ?? {});
  }
}
