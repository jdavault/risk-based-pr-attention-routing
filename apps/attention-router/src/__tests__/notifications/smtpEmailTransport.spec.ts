import { describe, expect, it, vi } from 'vitest';

import { createSmtpEmailTransport } from '../../notifications/smtpEmailTransport';

describe('createSmtpEmailTransport', () => {
  it('sends through the configured SMTP host and port', async () => {
    const sendMail = vi.fn().mockResolvedValue({ messageId: 'smtp-message-1' });
    const createClient = vi.fn().mockReturnValue({ sendMail });
    const transport = createSmtpEmailTransport(
      { host: 'localhost', port: 25 },
      createClient,
    );

    await expect(
      transport.send(
        {
          from: 'router@example.com',
          to: ['reviewers@example.com'],
          subject: '[MEDIUM] PR #17',
          text: 'Review attention changed.',
        },
        'owner/repository:17:MEDIUM',
      ),
    ).resolves.toEqual({ id: 'smtp-message-1' });

    expect(createClient).toHaveBeenCalledWith({
      host: 'localhost',
      port: 25,
    });
    expect(sendMail).toHaveBeenCalledWith({
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
    expect(() =>
      createSmtpEmailTransport({ host: 'localhost', port: 0 }),
    ).toThrow(/SMTP port/u);
  });
});
