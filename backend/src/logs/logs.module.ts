import { Module } from '@nestjs/common';
import { LogsService } from './logs.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoginAttemptLogAtFailedModel } from '../common/entity/login-attempt-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LoginAttemptLogAtFailedModel])],
  providers: [LogsService],
})
export class LogsModule {}
