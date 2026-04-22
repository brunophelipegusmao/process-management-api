import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

import { appEnv } from '../../config/app-env';
import type {
  EmailTransport,
  EmailTransportPayload,
  EmailTransportResult,
} from './email.service';

@Injectable()
export class SmtpEmailTransport implements EmailTransport {
  private readonly logger = new Logger(SmtpEmailTransport.name);
  private readonly transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: appEnv.email.smtp.host,
      port: appEnv.email.smtp.port,
      secure: appEnv.email.smtp.secure,
      auth: {
        user: appEnv.email.smtp.user,
        pass: appEnv.email.smtp.pass,
      },
    });
  }

  async send(payload: EmailTransportPayload): Promise<EmailTransportResult> {
    const sentAt = new Date();

    const info = await this.transporter.sendMail({
      from: appEnv.email.from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });

    this.logger.log(`smtp_sent to=${payload.to} messageId=${info.messageId}`);

    return {
      messageId: info.messageId as string,
      sentAt,
    };
  }
}
