// 🧹 임시 파일 삭제 스케줄러
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class CleanupSchedule {
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  handleCleanup() {
    // TODO: 임시 파일 삭제 로직 구현
  }
}
