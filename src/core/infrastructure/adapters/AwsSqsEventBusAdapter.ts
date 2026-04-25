import { EventBusPort } from "@/src/core/application/ports/EventBusPort";
import { DomainEvent } from "@/src/core/domain/events/DomainEventType";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

export class AwsSqsEventBusAdapter implements EventBusPort {
  private readonly client: SQSClient;
  private readonly queueUrl: string;

  constructor(region = process.env.AWS_REGION || "us-east-1") {
    this.client = new SQSClient({ region });
    const url = process.env.AWS_SQS_QUEUE_URL;
    if (!url) {
      throw new Error("AWS_SQS_QUEUE_URL is missing.");
    }
    this.queueUrl = url;
  }

  async publish<TPayload>(event: DomainEvent<TPayload>): Promise<void> {
    const command = new SendMessageCommand({
      QueueUrl: this.queueUrl,
      MessageBody: JSON.stringify(event),
      MessageAttributes: {
        EventType: {
          DataType: "String",
          StringValue: event.type,
        },
        TenantId: {
          DataType: "String",
          StringValue: event.tenantId,
        },
      },
    });

    try {
      await this.client.send(command);
    } catch (error: any) {
      throw new Error(`Failed to publish event to SQS: ${error.message}`);
    }
  }
}
