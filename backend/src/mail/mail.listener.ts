import { UsersModel } from '../users/entity/users.entity';
import { Injectable } from '@nestjs/common';
import { MailService } from './mail.service';
import { OnEvent } from '@nestjs/event-emitter';

interface UserUnlockRequestPayload {
  user: Pick<UsersModel, 'email' | 'username'>;
  verificationCode: string;
}

interface UserPasswordResetPayload {
  user: Pick<UsersModel, 'email' | 'username'>;
  temporaryPassword: string;
}

@Injectable()
export class MailListener {
  constructor(private readonly mailService: MailService) {}

  @OnEvent('user.unlock.request')
  handleUserUnlockRequestEvent(payload: UserUnlockRequestPayload) {
    this.mailService.sendAccountUnlockVerification(
      payload.user,
      payload.verificationCode,
    );
  }

  @OnEvent('user.password.reset')
  handleUserPasswordResetEvent(payload: UserPasswordResetPayload) {
    this.mailService.sendPasswordResetNotification(
      payload.user,
      payload.temporaryPassword,
    );
  }
}
