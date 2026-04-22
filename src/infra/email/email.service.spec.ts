import { EmailService } from './email.service';
import type { EmailRepository } from './email.repository';
import type { EmailTransport } from './email.service';

describe('EmailService', () => {
  let service: EmailService;
  let repository: jest.Mocked<EmailRepository>;
  let transport: jest.Mocked<EmailTransport>;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
    } as unknown as jest.Mocked<EmailRepository>;

    transport = {
      send: jest.fn(),
    } as unknown as jest.Mocked<EmailTransport>;

    service = new EmailService(repository, transport);
  });

  it('renders and sends template E1 while persisting the email log', async () => {
    transport.send.mockResolvedValue({
      messageId: 'msg-1',
      sentAt: new Date('2026-04-19T10:00:00.000Z'),
    });
    repository.create.mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      processId: '22222222-2222-4222-8222-222222222222',
      template: 'E1',
      recipient: 'cliente@teste.com',
      sentAt: new Date('2026-04-19T10:00:00.000Z'),
      repliedAt: null,
      acknowledgmentDate: null,
      fulfilledAt: null,
    });

    const result = await service.sendTemplate({
      processId: '22222222-2222-4222-8222-222222222222',
      template: 'E1',
      recipient: 'cliente@teste.com',
      variables: {
        processCode: 'PROC-001',
        witnessName: 'Maria da Silva',
        dueDate: '2026-04-24',
      },
    });

    expect(transport.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'cliente@teste.com',
        subject: expect.stringContaining('Maria da Silva'),
        html: expect.stringContaining('PROC-001'),
        text: expect.stringContaining('2026-04-24'),
      }),
    );
    expect(repository.create).toHaveBeenCalledWith({
      processId: '22222222-2222-4222-8222-222222222222',
      template: 'E1',
      recipient: 'cliente@teste.com',
      sentAt: new Date('2026-04-19T10:00:00.000Z'),
    });
    expect(result.messageId).toBe('msg-1');
  });
});
