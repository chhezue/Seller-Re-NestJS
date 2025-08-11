import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { TypeOrmModule } from '@nestjs/typeorm';
import { diskStorage } from 'multer';
import * as path from 'path';
import { v4 as uuid } from 'uuid';
import { FileModel } from './entity/file.entity';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { ProductImageModel } from './entity/product-image.entity';
import { AwsS3Service } from './service/aws-s3.service';
import { ImageProcessingService } from './service/image-processing.service';
import { CleanupSchedule } from './schedule/cleanup.schedule';

export const TEMP_FOLDER_PATH = path.join(process.cwd(), 'uploads_temp');

@Module({
  imports: [
    TypeOrmModule.forFeature([FileModel, ProductImageModel]),
    MulterModule.register({
      storage: diskStorage({
        destination: (req, file, cb) => {
          cb(null, TEMP_FOLDER_PATH); // 임시 저장 폴더
        },
        filename: (req, file, cb) => {
          cb(null, `${uuid()}${path.extname(file.originalname)}`); // 파일명 중복을 피하기 위해 uuid 사용
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10mb 제한
    }),
  ],
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
