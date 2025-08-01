import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { LoginAttemptLogAtFailedModel } from '../common/entity/login-attempt-log.entity';
import { Repository } from 'typeorm';
import { LoginFailedDto } from '../auth/dto/login-failed.dto';

@Injectable()
export class LogsService {
  constructor(
    @InjectRepository(LoginAttemptLogAtFailedModel)
    private readonly loginAttemptLogRepository: Repository<LoginAttemptLogAtFailedModel>,
  ) {}

  private readonly logger = new Logger(LogsService.name);

  @OnEvent('login.failed')
  async handleLoginFailedEvent(payload: LoginFailedDto) {
    this.logger.warn(
      `[Login Failed] ID: ${payload.user.id} | Email: ${payload.user.email} | IP: ${payload.ip} | Failed Count : ${payload.user.passwordFailedCount + 1} | Time: ${new Date().toISOString()}`,
    );

    const newLog = this.loginAttemptLogRepository.create({
      user: payload.user,
      ip: payload.ip,
    });

    await this.loginAttemptLogRepository.save(newLog);
  }
}
