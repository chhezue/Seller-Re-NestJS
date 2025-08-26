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

export const TEMP_FOLDER_PATH = path.join(process.cwd(), 'uploads_temp');

// 폴더가 없으면 자동 생성
if (!fs.existsSync(TEMP_FOLDER_PATH)) {
  fs.mkdirSync(TEMP_FOLDER_PATH, { recursive: true });
  console.log(`📁 Created uploads directory: ${TEMP_FOLDER_PATH}`);
}

@Module({
  imports: [
    TypeOrmModule.forFeature([FileModel, ProductImageModel]),
    MulterModule.register({
      storage: diskStorage({
        destination: (req, file, cb) => {
          cb(null, TEMP_FOLDER_PATH); // 임시 저장 폴더
        },
        filename: (req, file, cb) => {
          // 한글 파일명 인코딩 문제 해결
          const decodedOriginalName = Buffer.from(
            file.originalname,
            'latin1',
          ).toString('utf8');
          const fileExtension = path.extname(decodedOriginalName);
          const uniqueFileName = `${uuid()}${fileExtension}`;

          // 디코딩된 파일명을 originalname에 다시 할당 (DB 저장용)
          file.originalname = decodedOriginalName;

          cb(null, uniqueFileName);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10mb 제한
      fileFilter: (req, file, cb) => {
        // 한글 파일명 인코딩 문제 해결
        file.originalname = Buffer.from(file.originalname, 'latin1').toString(
          'utf8',
        );

        // Multer 단계에서 파일 타입 검증
        const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg'];
        if (allowedMimeTypes.includes(file.mimetype)) {
          cb(null, true); // 허용
        } else {
          cb(new Error(`지원하지 않는 파일 형식: ${file.mimetype}`), false); // 거부
        }
      },
    }),
  ],
  controllers: [UploadsController],
  providers: [UploadsService, S3Service, CleanupSchedule],
  exports: [UploadsService, S3Service],
})
export class UploadsModule {}
