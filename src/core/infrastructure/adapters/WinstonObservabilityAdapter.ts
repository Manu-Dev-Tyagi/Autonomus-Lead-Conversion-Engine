import winston from "winston";
import { ObservabilityPort } from "@/src/core/application/ports/ObservabilityPort";

export class WinstonObservabilityAdapter implements ObservabilityPort {
  private logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || "info",
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      defaultMeta: { service: "ale-engine" },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          ),
        }),
      ],
    });
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.logger.info(message, data);
  }

  error(message: string, data?: Record<string, unknown>): void {
    this.logger.error(message, data);
  }

  metric(name: string, value: number, tags?: Record<string, string>): void {
    // In a real production system, this would send to Datadog, Prometheus, etc.
    // For now, we log it as a structured metric.
    this.logger.info(`Metric: ${name}`, { metric: name, value, tags });
  }
}
