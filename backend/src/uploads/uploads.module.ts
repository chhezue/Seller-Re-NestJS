import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { AwsS3Service } from './service/aws-s3.service';
import { ImageProcessingService } from './service/image-processing.service';
import { CleanupSchedule } from './schedule/cleanup.schedule';

@Module({
  controllers: [UploadsController],
  providers: [
    UploadsService,
    AwsS3Service,
    ImageProcessingService,
    CleanupSchedule,
  ],
  exports: [UploadsService, AwsS3Service, ImageProcessingService],
})
export class UploadsModule {}
