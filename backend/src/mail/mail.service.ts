import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { UsersModel } from '../users/entity/users.entity';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendAccountUnlockVerification(
    user: Pick<UsersModel, 'email' | 'username'>,
    code: string,
  ) {
    await this.mailerService
      .sendMail({
        to: user.email,
        subject: '[SellerRe] 계정 잠금 해제 인증 코드',
        template: 'unlock-verification',
        context: {
          username: user.username,
          code,
        },
      })
      .catch((err) => {
        console.error(err);
      });
  }
}
