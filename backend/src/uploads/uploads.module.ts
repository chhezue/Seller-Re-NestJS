import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { AwsS3Service } from './service/aws-s3.service';
import { ImageProcessingService } from './service/image-processing.service';
import { CleanupSchedule } from './schedule/cleanup.schedule';
import { FileModel } from './entity/file.entity';
import { ProductImageModel } from './entity/product-image.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FileModel, ProductImageModel])],
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
