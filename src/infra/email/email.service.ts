import { Inject, Injectable, Logger } from '@nestjs/common';

import { appEnv } from '../../config/app-env';
import { EmailRepository, type EmailEntity } from './email.repository';
import {
  renderEmailTemplate,
  type EmailTemplateVariables,
} from './email.templates';

export const EMAIL_TRANSPORT = Symbol('EMAIL_TRANSPORT');

export type EmailTransportPayload = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type EmailTransportResult = {
  messageId: string;
  sentAt: Date;
};

export interface EmailTransport {
  send(payload: EmailTransportPayload): Promise<EmailTransportResult>;
}

export type SendTemplateInput = {
  processId: string;
  template: EmailEntity['template'];
  recipient: string;
  variables?: EmailTemplateVariables;
};

@Injectable()
export class ConsoleEmailTransport implements EmailTransport {
  private readonly logger = new Logger(ConsoleEmailTransport.name);

  async send(payload: EmailTransportPayload): Promise<EmailTransportResult> {
    const sentAt = new Date();
    const messageId = `console-${sentAt.getTime()}`;

    this.logger.log(
      `email_provider=${appEnv.email.provider} to=${payload.to} subject="${payload.subject}" messageId=${messageId}`,
    );

    return {
      messageId,
      sentAt,
    };
  }
}

@Injectable()
export class EmailService {
  constructor(
    private readonly emailRepository: EmailRepository,
    @Inject(EMAIL_TRANSPORT)
    private readonly emailTransport: EmailTransport,
  ) {}

  async sendTemplate(input: SendTemplateInput) {
    const renderedTemplate = renderEmailTemplate(
      input.template,
      input.variables ?? {},
    );
    const transportResult = await this.emailTransport.send({
      to: input.recipient,
      subject: renderedTemplate.subject,
      html: renderedTemplate.html,
      text: renderedTemplate.text,
    });

    await this.emailRepository.create({
      processId: input.processId,
      template: input.template,
      recipient: input.recipient,
      sentAt: transportResult.sentAt,
    });

    return {
      ...transportResult,
      ...renderedTemplate,
    };
  }
}
