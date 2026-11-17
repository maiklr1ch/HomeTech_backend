import { Injectable } from '@nestjs/common';
import { config } from '../config';
import { MailService } from '../mail/mail.service';
import type { UserEntity } from '../users/user.entity';

@Injectable()
export class AccountMailer {
  constructor(private readonly mail: MailService) {}

  sendAccountCreated(client: UserEntity, temporaryPassword: string): Promise<boolean> {
    return this.mail.send({
      to: client.email,
      subject: 'Обліковий запис в інтернет-магазині «ДомТех»',
      text: [
        `Вітаємо, ${client.fullName}!`,
        '',
        'Для вас створено обліковий запис в інтернет-магазині побутової техніки «ДомТех».',
        `Email для входу: ${client.email}`,
        `Тимчасовий пароль: ${temporaryPassword}`,
        '',
        'Після першого входу змініть пароль у профілі.',
        ...this.siteLine(),
      ].join('\n'),
    });
  }

  sendPasswordReset(client: UserEntity, temporaryPassword: string): Promise<boolean> {
    return this.mail.send({
      to: client.email,
      subject: 'Новий пароль до облікового запису «ДомТех»',
      text: [
        `Вітаємо, ${client.fullName}!`,
        '',
        'Адміністратор магазину «ДомТех» скинув пароль до вашого облікового запису.',
        `Тимчасовий пароль: ${temporaryPassword}`,
        '',
        'Після входу змініть пароль у профілі.',
        ...this.siteLine(),
      ].join('\n'),
    });
  }

  private siteLine(): string[] {
    return config.publicUrl ? ['', `Увійти: ${config.publicUrl}`] : [];
  }
}
