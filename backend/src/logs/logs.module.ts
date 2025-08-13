import { Module } from '@nestjs/common';
import { LogsService } from './logs.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoginAttemptLogAtFailedModel } from './entity/login-attempt-log.entity';
import { TokenEventLogModel } from './entity/token-event-log.entity';
import { EmailLogModel } from './entity/email-log.entity';
import { PasswordChangeLogModel } from './entity/password-change-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LoginAttemptLogAtFailedModel,
      TokenEventLogModel,
      EmailLogModel,
      PasswordChangeLogModel,
    ]),
  ],
  providers: [LogsService],
})
export class LogsModule {}
