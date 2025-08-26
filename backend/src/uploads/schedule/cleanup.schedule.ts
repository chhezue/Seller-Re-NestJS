import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { FileModel, FileStatus } from '../entity/file.entity';
import { LessThan, Repository } from 'typeorm';
import * as path from 'node:path';
import { promises as fs } from 'fs';

// 매일 자정마다 임시 폴더의 고아 파일을 삭제하는 스케줄러
@Injectable()
export class CleanupSchedule {
  private readonly logger = new Logger(CleanupSchedule.name);

  constructor(
    @InjectRepository(FileModel)
    private readonly fileRepository: Repository<FileModel>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT) // 매일 자정에 실행
  // @Cron('*/1 * * * *') // 테스트를 위해 1분마다 실행
  async handleCleanup() {
    this.logger.debug('Running cleanup temporary files...');

    // 하루 이상 지난 temp files를 찾기 위한 시간 기준 설정
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // DB에서 조건에 맞는 파일 레코드 목록 조회
    const oldTempFiles = await this.fileRepository.find({
      where: {
        status: FileStatus.TEMPORARY,
        createdAt: LessThan(oneDayAgo),
      },
    });

    if (oldTempFiles.length === 0) {
      this.logger.debug('No temporary files found.');
      return;
    }

    this.logger.debug(`${oldTempFiles.length} temporary files found.`);

    for (const file of oldTempFiles) {
      const filePath = path.join(process.cwd(), 'uploads_temp', file.key);

      try {
        // 1. 로컬 uploads_temp 폴더에서 실제 파일 삭제
        await fs.unlink(filePath);

        // 2. DB에서 해당 파일 레코드 삭제
        await this.fileRepository.delete({ id: file.id });

        this.logger.debug(`Deleted temporary file ${file.key}`);
      } catch (e) {
        this.logger.error(
          `Failed to delete temporary file ${file.key}:`,
          e.stack,
        );
      }
    }
  }
}
