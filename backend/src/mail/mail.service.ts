import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { UsersModel } from '../users/entity/users.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EmailSendStatus } from '../logs/const/email-send-status.const';
import { ConfigService } from '@nestjs/config';
import { ISendMailOptions } from '@nestjs-modules/mailer/dist/interfaces/send-mail-options.interface';

@Injectable()
export class MailService {
  private readonly appName: string;

  constructor(
    private readonly mailerService: MailerService,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
  ) {
    this.appName = this.configService.get<string>('APP_NAME', 'Seller_Re');
  }

  async sendAccountUnlockVerification(
    user: Pick<UsersModel, 'id' | 'email' | 'username'>,
    code: string,
  ) {
    const subject = `[${this.appName}] 계정 잠금 해제 인증 코드`;
    const mailOptions: ISendMailOptions = {
      to: user.email,
      subject,
      template: 'unlock-verification',
      context: { username: user.username, code },
    };
    await this.sendMailWithLogging(mailOptions, user, 'unlock verification');
  }

  async sendPasswordResetNotification(
    user: Pick<UsersModel, 'id' | 'email' | 'username'>,
    temporaryPassword: string,
  ) {
    const subject = `[${this.appName}] 비밀번호가 초기화되었습니다.`;
    const mailOptions: ISendMailOptions = {
      to: user.email,
      subject,
      template: 'password-reset',
      context: {
        username: user.username,
        password: temporaryPassword,
      },
    };
    await this.sendMailWithLogging(mailOptions, user, 'password reset');
  }

  private async sendMailWithLogging(
    mailOptions: ISendMailOptions,
    user: Pick<UsersModel, 'id' | 'email' | 'username'>,
    logContext: string,
  ) {
    try {
      await this.mailerService.sendMail(mailOptions);
      this.eventEmitter.emit('email.sent', {
        user,
        recipient: mailOptions.to,
        subject: mailOptions.subject,
        status: EmailSendStatus.SENT,
      });
    } catch (err) {
      console.error(`failed to send ${logContext} email`, err);
      this.eventEmitter.emit('email.sent', {
        user,
        recipient: mailOptions.to,
        subject: mailOptions.subject,
        status: EmailSendStatus.FAILED,
        errorMessage: err.message,
      });
    }
  }
}
