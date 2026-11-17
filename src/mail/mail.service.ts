import { Global, Injectable, Logger, Module } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';
import { config } from '../config';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger('Mail');
  private transporter: Transporter | null = null;

  get isConfigured(): boolean {
    return Boolean(config.smtp.host && config.smtp.from);
  }

  async send(message: MailMessage): Promise<boolean> {
    if (!this.isConfigured) {
      this.logger.warn(`SMTP не налаштовано, лист «${message.subject}» для ${message.to} не надіслано`);
      return false;
    }
    try {
      await this.transport().sendMail({ from: config.smtp.from, ...message });
      return true;
    } catch (e) {
      this.logger.error(`Не вдалося надіслати лист для ${message.to}: ${e instanceof Error ? e.message : String(e)}`);
      return false;
    }
  }

  private transport(): Transporter {
    this.transporter ??= nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
    });
    return this.transporter;
  }
}

@Global()
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
