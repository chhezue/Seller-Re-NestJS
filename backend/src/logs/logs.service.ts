import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { LoginAttemptLogAtFailedModel } from './entity/login-attempt-log.entity';
import { Repository } from 'typeorm';
import { LoginFailedDto } from './dto/login-failed.dto';
import {
  TokenEventLogModel,
  TokenEventType,
} from './entity/token-event-log.entity';
import { TokenRotationFailedDto } from './dto/token-rotation-failed.dto';
import { EmailLogModel } from './entity/email-log.entity';
import { EmailSentDto } from './dto/email.sent.dto';

@Injectable()
export class LogsService {
  constructor(
    @InjectRepository(LoginAttemptLogAtFailedModel)
    private readonly loginAttemptLogRepository: Repository<LoginAttemptLogAtFailedModel>,
    @InjectRepository(TokenEventLogModel)
    private readonly tokenEventLogRepository: Repository<TokenEventLogModel>,
    @InjectRepository(EmailLogModel)
    private readonly emailLogRepository: Repository<EmailLogModel>,
  ) {}

  private readonly logger = new Logger(LogsService.name);

  @OnEvent('login.failed')
  async handleLoginFailedEvent(payload: LoginFailedDto) {
    this.logger.warn(
      `[Login Failed] Event: PasswordFailed. ID: ${payload.user.id} | Email: ${payload.user.email} | IP: ${payload.ip} | Failed Count : ${payload.user.passwordFailedCount + 1} | Time: ${new Date().toISOString()}`,
    );

    const newLog = this.loginAttemptLogRepository.create({
      user: payload.user,
      ip: payload.ip,
    });

    await this.loginAttemptLogRepository.save(newLog);
  }

  @OnEvent('token.rotation.failed.NoRefreshToken')
  async handleTokenRotationFailedNoRefreshTokenEvent(
    payload: TokenRotationFailedDto,
  ) {
    const description = `An attempt was made to rotate a token that does not exist in the database.`;
    this.logger.warn(
      `[Token Rotation Failed] Event: NoRefreshToken. UserId: ${payload.userId} | Email: ${payload.email} | IP: ${payload.ip} | Time: ${new Date().toISOString()} | Description: ${description}`,
    );

    const newLog = this.tokenEventLogRepository.create({
      user: { id: payload.userId },
      ip: payload.ip,
      eventType: TokenEventType.ROTATION_FAILED_NO_TOKEN,
      description: description,
    });

    await this.tokenEventLogRepository.save(newLog);
  }

  @OnEvent('token.rotation.failed.RevokedRefreshToken')
  async handleTokenRotationFailedRevokedRefreshTokenEvent(
    payload: TokenRotationFailedDto,
  ) {
    const description = `An attempt was made with a revoked refresh token. All user sessions have been terminated.`;
    this.logger.error(
      `[CRITICAL - Token Rotation Failed] Event: RevokedRefreshToken. UserId: ${payload.userId} | Email: ${payload.email} | IP: ${payload.ip} | Time: ${new Date().toISOString()} | Description: ${description}`,
    );

    const newLog = this.tokenEventLogRepository.create({
      user: { id: payload.userId },
      ip: payload.ip,
      eventType: TokenEventType.ROTATION_FAILED_REVOKED_TOKEN,
      description,
    });

    await this.tokenEventLogRepository.save(newLog);
  }

  @OnEvent('email.sent')
  async handleEmailSentEvent(payload: EmailSentDto) {
    this.logger.log(
      `[Email Sent] Recipient: ${payload.recipient} | Subject: ${payload.subject} | Status : ${payload.status}`,
    );

    const newLog = this.emailLogRepository.create({
      user: payload.user ? { id: payload.user.id } : null,
      recipient: payload.recipient,
      subject: payload.subject,
      status: payload.status,
      errorMessage: payload.errorMessage,
    });

    await this.emailLogRepository.save(newLog);
  }
}
