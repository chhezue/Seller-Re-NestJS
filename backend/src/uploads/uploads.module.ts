import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { TypeOrmModule } from '@nestjs/typeorm';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuid } from 'uuid';
import { FileModel } from './entity/file.entity';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { ProductImageModel } from './entity/product-image.entity';
import { S3Service } from '../s3/s3.service';
import { CleanupSchedule } from './schedule/cleanup.schedule';
import { HttpModule } from '@nestjs/axios';
import { CategoryModel } from '../common/entity/category.entity';

export const TEMP_FOLDER_PATH = path.join(process.cwd(), 'uploads_temp');

// 폴더가 없으면 자동 생성
if (!fs.existsSync(TEMP_FOLDER_PATH)) {
  fs.mkdirSync(TEMP_FOLDER_PATH, { recursive: true });
  console.log(`📁 Created uploads directory: ${TEMP_FOLDER_PATH}`);
}

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([FileModel, ProductImageModel, CategoryModel]),
    MulterModule.register({
      storage: diskStorage({
        destination: (req, file, cb) => {
          cb(null, TEMP_FOLDER_PATH);
        },
        filename: (req, file, cb) => {
          const decodedOriginalName = Buffer.from(
            file.originalname,
            'latin1',
          ).toString('utf8');
          const fileExtension = path.extname(decodedOriginalName);
          const uniqueFileName = `${uuid()}${fileExtension}`;

          file.originalname = decodedOriginalName;

          cb(null, uniqueFileName);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        file.originalname = Buffer.from(file.originalname, 'latin1').toString(
          'utf8',
        );

        const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg'];
        if (allowedMimeTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error(`지원하지 않는 파일 형식: ${file.mimetype}`), false);
        }
      },
    }),
  ],
  controllers: [UploadsController],
  providers: [UploadsService, S3Service, CleanupSchedule],
  exports: [UploadsService, S3Service],
})
export class UploadsModule {}

