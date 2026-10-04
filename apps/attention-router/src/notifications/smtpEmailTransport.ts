import nodemailer from 'nodemailer';

import type {
  EmailMessage,
  EmailTransport,
} from './emailNotification';

export interface SmtpConfiguration {
  readonly host: string;
  readonly port: number;
}

interface SmtpMessage extends EmailMessage {
  readonly headers: Readonly<Record<string, string>>;
}

interface SmtpDelivery {
  readonly messageId: string;
}

interface SmtpClient {
  sendMail(message: SmtpMessage): Promise<SmtpDelivery>;
}

export type SmtpClientFactory = (
  configuration: SmtpConfiguration,
) => SmtpClient;

function createNodemailerClient(
  configuration: SmtpConfiguration,
): SmtpClient {
  const transporter = nodemailer.createTransport({
    host: configuration.host,
    port: configuration.port,
  });

  return {
    async sendMail(message) {
      const delivery = await transporter.sendMail({
        ...message,
        to: [...message.to],
      });

      return { messageId: delivery.messageId };
    },
  };
}

function validateConfiguration(configuration: SmtpConfiguration): void {
  if (configuration.host.trim().length === 0) {
    throw new Error('SMTP host is required.');
  }

  if (
    !Number.isInteger(configuration.port) ||
    configuration.port < 1 ||
    configuration.port > 65_535
  ) {
    throw new Error('SMTP port must be an integer between 1 and 65535.');
  }
}

export function createSmtpEmailTransport(
  configuration: SmtpConfiguration,
  createClient: SmtpClientFactory = createNodemailerClient,
): EmailTransport {
  validateConfiguration(configuration);
  const client = createClient(configuration);

  return {
    async send(message, idempotencyKey) {
      const delivery = await client.sendMail({
        ...message,
        headers: {
          'X-PAR-Idempotency-Key': idempotencyKey,
        },
      });

      if (delivery.messageId.trim().length === 0) {
        throw new Error('SMTP delivery did not return a message identifier.');
      }

      return { id: delivery.messageId };
    },
  };
}
