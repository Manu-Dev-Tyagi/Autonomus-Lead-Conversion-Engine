import { ClockPort } from "@/src/core/application/ports/ClockPort";

export class SystemClock implements ClockPort {
  nowIso(): string {
    return new Date().toISOString();
  }
}
