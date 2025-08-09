import { Module } from '@nestjs/common';
import { LogsService } from './logs.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoginAttemptLogAtFailedModel } from './entity/login-attempt-log.entity';
import { TokenEventLogModel } from './entity/token-event-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LoginAttemptLogAtFailedModel,
      TokenEventLogModel,
    ]),
  ],
  providers: [LogsService],
})
export class LogsModule {}
