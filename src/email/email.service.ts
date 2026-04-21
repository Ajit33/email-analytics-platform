// email/email.service.ts
import {
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface SendEmailParams {
  to: string;
  toName: string;
  subject: string;
  html: string;
  textBody?: string; // optional plain-text fallback — matches EmailEventJob
}

@Injectable()
export class EmailService
  implements OnModuleInit
{
  private readonly logger = new Logger(
    EmailService.name,
  );
  private readonly transporter: nodemailer.Transporter;
  private readonly fromName: string;
  private readonly fromEmail: string;

  constructor(
    private readonly config: ConfigService,
  ) {
    this.fromName = this.config.get<string>(
      'SMTP_FROM_NAME',
      'Newsletter',
    );
    this.fromEmail =
      this.config.getOrThrow<string>(
        'SMTP_FROM_EMAIL',
      );

    this.transporter = nodemailer.createTransport(
      {
        host: this.config.getOrThrow<string>(
          'SMTP_HOST',
        ),
        port: parseInt(
          this.config.get('SMTP_PORT', '587'),
          10,
        ),
        secure:
          this.config.get(
            'SMTP_SECURE',
            'false',
          ) === 'true', // ← this line
        auth: {
          user: this.config.getOrThrow<string>(
            'SMTP_USER',
          ),
          pass: this.config.getOrThrow<string>(
            'SMTP_PASS',
          ),
        },
      },
    );
  }

  // Verify SMTP connection on startup so you know immediately
  // if credentials are wrong — not on the first email send.
  async onModuleInit(): Promise<void> {
    const ok = await this.verifyConnection();
    if (ok) {
      this.logger.log('SMTP connection verified');
    } else {
      this.logger.error(
        'SMTP connection failed — check SMTP_HOST, SMTP_USER, SMTP_PASS in .env',
      );
    }
  }

  async send(
    params: SendEmailParams,
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: `"${params.toName}" <${params.to}>`,
        subject: params.subject,
        html: params.html,
        // plain text fallback — email clients show this if HTML blocked
        text:
          params.textBody ??
          params.html.replace(/<[^>]+>/g, ''),
      });

      this.logger.debug(
        `Email sent to ${params.to} — subject: "${params.subject}"`,
      );
    } catch (err) {
      // Log with full context so you can debug SMTP failures
      this.logger.error(
        `Failed to send email to ${params.to}: ${(err as Error).message}`,
        (err as Error).stack,
      );
      // Re-throw so the email worker can retry via BullMQ
      throw err;
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (err) {
      this.logger.error(
        `SMTP verify failed: ${(err as Error).message}`,
      );
      return false;
    }
  }
}
