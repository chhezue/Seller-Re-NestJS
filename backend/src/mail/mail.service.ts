import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { UsersModel } from '../users/entity/users.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EmailSendStatus } from '../logs/const/email-send-status.const';

@Injectable()
export class MailService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async sendAccountUnlockVerification(
    user: Pick<UsersModel, 'email' | 'username'>,
    code: string,
  ) {
    const recipient = user.email;
    const subject = '[SellerRe] 계정 잠금 해제 인증 코드';

    await this.mailerService
      .sendMail({
        to: recipient,
        subject,
        template: 'unlock-verification',
        context: {
          username: user.username,
          code,
        },
      })
      .then(() => {
        this.eventEmitter.emit('email.sent', {
          user,
          recipient,
          subject,
          status: EmailSendStatus.SENT,
        });
      })
      .catch((err) => {
        console.error('failed to send unlock verification email', err);
        this.eventEmitter.emit('email.sent', {
          user,
          recipient,
          subject,
          status: EmailSendStatus.FAILED,
          errorMessage: err.message,
        });
      });
  }

  async sendPasswordResetNotification(
    user: Pick<UsersModel, 'email' | 'username'>,
    temporaryPassword: string,
  ) {
    const recipient = user.email;
    const subject = '[SellerRe] 비밀번호가 초기화되었습니다.';
    await this.mailerService
      .sendMail({
        to: recipient,
        subject,
        template: 'password-reset',
        context: {
          username: user.username,
          password: temporaryPassword,
        },
      })
      .then(() => {
        this.eventEmitter.emit('email.sent', {
          user,
          recipient,
          subject,
          status: EmailSendStatus.SENT,
        });
      })
      .catch((err) => {
        console.error('failed to send password reset notification email', err);
        this.eventEmitter.emit('email.sent', {
          user,
          recipient,
          subject,
          status: EmailSendStatus.FAILED,
          errorMessage: err.message,
        });
      });
  }
}
