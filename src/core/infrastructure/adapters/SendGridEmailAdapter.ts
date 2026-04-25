import { EmailDeliveryPort, EmailMessage } from "@/src/core/application/ports/EmailDeliveryPort";
import sgMail from "@sendgrid/mail";

export class SendGridEmailAdapter implements EmailDeliveryPort {
  private readonly defaultFrom: string;

  constructor(apiKey = process.env.SENDGRID_API_KEY) {
    if (!apiKey) {
      throw new Error("SENDGRID_API_KEY is missing.");
    }
    sgMail.setApiKey(apiKey);
    this.defaultFrom = process.env.ALE_EMAIL_FROM || "outreach@ale.app";
  }

  async sendEmail(message: EmailMessage): Promise<{ messageId: string }> {
    const [response] = await sgMail.send({
      to: message.to,
      from: message.from || this.defaultFrom,
      subject: message.subject,
      html: message.body,
      replyTo: message.replyTo,
    });

    const messageId = response.headers["x-message-id"] as string;
    if (!messageId) {
      throw new Error("SendGrid failed to return a messageId.");
    }

    return { messageId };
  }
}
