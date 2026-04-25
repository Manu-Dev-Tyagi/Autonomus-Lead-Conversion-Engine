import { EmailDeliveryPort, EmailMessage } from "@/src/core/application/ports/EmailDeliveryPort";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

export class AwsSesEmailAdapter implements EmailDeliveryPort {
  private readonly client: SESClient;
  private readonly defaultFrom: string;

  constructor(region = process.env.AWS_REGION || "us-east-1") {
    this.client = new SESClient({ region });
    this.defaultFrom = process.env.ALE_EMAIL_FROM || "outreach@ale.app";
  }

  async sendEmail(message: EmailMessage): Promise<{ messageId: string }> {
    const command = new SendEmailCommand({
      Destination: {
        ToAddresses: [message.to],
      },
      Message: {
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: message.body,
          },
        },
        Subject: {
          Charset: "UTF-8",
          Data: message.subject,
        },
      },
      Source: message.from || this.defaultFrom,
      ReplyToAddresses: message.replyTo ? [message.replyTo] : undefined,
    });

    try {
      const result = await this.client.send(command);
      if (!result.MessageId) {
        throw new Error("AWS SES failed to return a MessageId.");
      }
      return { messageId: result.MessageId };
    } catch (error: any) {
      throw new Error(`AWS SES Delivery failed: ${error.message}`);
    }
  }
}
