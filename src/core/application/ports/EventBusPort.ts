import { DomainEvent } from "@/src/core/domain/events/DomainEventType";

export interface EventBusPort {
  publish<TPayload>(event: DomainEvent<TPayload>): Promise<void>;
}
