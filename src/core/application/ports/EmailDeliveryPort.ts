export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
  from?: string;
  replyTo?: string;
}

export interface EmailDeliveryPort {
  sendEmail(message: EmailMessage): Promise<{ messageId: string }>;
}
