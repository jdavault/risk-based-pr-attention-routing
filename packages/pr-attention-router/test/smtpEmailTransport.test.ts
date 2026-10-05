import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createSmtpEmailTransport } from '../lib/smtpEmailTransport.ts';

describe('createSmtpEmailTransport', () => {
  it('sends through the configured SMTP client with the idempotency header', async () => {
    let createdConfiguration: unknown;
    let sentMessage: unknown;
    const transport = createSmtpEmailTransport(
      { host: 'localhost', port: 25 },
      (configuration) => {
        createdConfiguration = configuration;
        return {
          async sendMail(message) {
            sentMessage = message;
            return { messageId: 'smtp-message-1' };
          },
        };
      },
    );

    assert.deepEqual(
      await transport.send(
        {
          from: 'router@example.com',
          to: ['reviewers@example.com'],
          subject: '[MEDIUM] PR #17',
          text: 'Review attention changed.',
        },
        'owner/repository:17:MEDIUM',
      ),
      { id: 'smtp-message-1' },
    );
    assert.deepEqual(createdConfiguration, { host: 'localhost', port: 25 });
    assert.deepEqual(sentMessage, {
      from: 'router@example.com',
      to: ['reviewers@example.com'],
      subject: '[MEDIUM] PR #17',
      text: 'Review attention changed.',
      headers: {
        'X-PAR-Idempotency-Key': 'owner/repository:17:MEDIUM',
      },
    });
  });

  it('rejects an invalid SMTP port before creating a client', () => {
    assert.throws(
      () => createSmtpEmailTransport({ host: 'localhost', port: 0 }),
      /SMTP port/u,
    );
  });
});
