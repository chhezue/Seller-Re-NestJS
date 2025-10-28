import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { UploadTempResponseDto } from './dto/upload-temp-response.dto';
import { FileModel, FileStatus } from './entity/file.entity';
import { ImageCommitDto } from './dto/image-commit.dto';
import { S3Service } from '../s3/s3.service';
import * as path from 'node:path';
import { promises as fs } from 'fs';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom } from 'rxjs';

@Injectable()
export class UploadsService {
  private readonly analysisApiUrl = 'http://localhost:8001/analyze';

  constructor(
    private readonly s3Service: S3Service,
    @InjectRepository(FileModel)
    private readonly fileRepository: Repository<FileModel>,
    private readonly httpService: HttpService,
  ) {}

  private async analyzeImages(imagePaths: string[]): Promise<any> {
    const { data } = await firstValueFrom(
      this.httpService
        .post(this.analysisApiUrl, {
          image_paths: imagePaths,
        })
        .pipe(
          catchError((error: any) => {
            const errorData = error.response?.data || 'Unknown error';
            console.error(`AI 서버 통신 오류: ${JSON.stringify(errorData)}`);
            throw new InternalServerErrorException(
              'AI 분석 서버와 통신하는 중 오류가 발생했습니다.',
            );
          }),
        ),
    );
    return data;
  }

  async uploadTempFiles(
    files: Array<Express.Multer.File>,
  ): Promise<UploadTempResponseDto[]> {
    if (!files.length) {
      throw new BadRequestException('파일이 제공되지 않았습니다.');
    }

    const savedPromises = files.map((file) => {
      // PostgreSQL에 저장하기 전에 파일 이름에서 NULL 바이트를 제거합니다.
      const sanitizedOriginalName = file.originalname.replace(/\0/g, '');

      const newFile = this.fileRepository.create({
        originalName: sanitizedOriginalName,
        mimeType: file.mimetype,
        size: file.size,
        key: file.filename,
        url: `/uploads_temp/${file.filename}`, // 임시 접근 url
        status: FileStatus.TEMPORARY,
      });
      return this.fileRepository.save(newFile); // save는 프로미스 반환
    });

    const savedFiles = await Promise.all(savedPromises);

    return savedFiles.map(
      (fileEntity) => new UploadTempResponseDto(fileEntity),
    );
  }

  async uploadTempProductFiles(
    files: Array<Express.Multer.File>,
  ): Promise<UploadTempResponseDto[]> {
    if (!files.length) {
      throw new BadRequestException('파일이 제공되지 않았습니다.');
    }

    // 1. 모든 파일을 먼저 데이터베이스에 저장합니다.
    const savedFilePromises = files.map((file) => {
      // PostgreSQL에 저장하기 전에 파일 이름에서 NULL 바이트를 제거합니다.
      const sanitizedOriginalName = file.originalname.replace(/\0/g, '');

      const newFile = this.fileRepository.create({
        originalName: sanitizedOriginalName,
        mimeType: file.mimetype,
        size: file.size,
        key: file.filename,
        url: `/uploads_temp/${file.filename}`,
        status: FileStatus.TEMPORARY,
      });
      return this.fileRepository.save(newFile);
    });
    const savedFiles = await Promise.all(savedFilePromises);

    const analysisResult: {
      category?: string;
      itemName?: string;
      probability?: number;
    } = {};

    try {
      // 2. 저장된 모든 파일의 전체 경로 배열을 생성합니다.
      const imageFullPaths = savedFiles.map((sf) =>
        path.join('backend', 'uploads_temp', sf.key),
      );

      // AI 분석을 위해 전송하는 이미지 파일 경로들을 로그로 남깁니다.
      console.log(
        `AI 분석 요청 (이미지 ${imageFullPaths.length}개): ${imageFullPaths.join(', ')}`,
      );

      // 3. 모든 이미지를 한번에 분석하도록 요청합니다.
      const bulkAnalysis = await this.analyzeImages(imageFullPaths);

      // 분석 결과 로그 기록 (상위 2개)
      console.log(`--- 통합 이미지 분석 결과 ---`);
      bulkAnalysis.results.forEach((result) => {
        const percentage = (result.probability * 100).toFixed(2);
        console.log(`- ${result.keyword}: ${percentage}%`);
      });
      console.log('----------------------------------');

      // 4. 가장 확률이 높은 결과를 사용합니다.
      const topResult = bulkAnalysis.results[0];

      if (topResult) {
        analysisResult.category = topResult.keyword;
        analysisResult.itemName = topResult.keyword;
        analysisResult.probability = topResult.probability;
      }
    } catch (e) {
      console.error(`통합 이미지 분석 실패: ${e.message}`);
    }

    // 5. 각 파일에 대해 동일한 분석 결과를 포함한 응답 DTO를 생성합니다.
    return savedFiles.map(
      (savedFile) => new UploadTempResponseDto(savedFile, analysisResult),
    );
  }

  async commitFiles(imageDtos: ImageCommitDto[]): Promise<FileModel[]> {
    if (!imageDtos.length) {
      throw new BadRequestException('파일이 제공되지 않았습니다.');
    }

    const fileIds = imageDtos.map((image) => image.fileId);

    const files = await this.fileRepository.find({
      where: { id: In(fileIds) },
    });

    if (files.length !== fileIds.length) {
      throw new BadRequestException(
        '존재하지 않는 파일 ID가 포함되어 있습니다.',
      );
    }

    files.forEach((file) => {
      if (file.status !== FileStatus.TEMPORARY) {
        throw new BadRequestException(
          '최종 파일 업로드는 TEMPORARY 상태일 때만 가능합니다.',
        );
      }
    });

    const uploadPromises = files.map(async (file) => {
      const localFilePath = path.join(process.cwd(), 'uploads_temp', file.key);

      try {
        const fileBuffer = await fs.readFile(localFilePath);
        const s3Url = await this.s3Service.upload(
          file.key,
          fileBuffer,
          file.mimeType,
        );

        file.status = FileStatus.PERMANENT;
        file.url = s3Url;

        const updatedFile = await this.fileRepository.save(file);
        await fs.unlink(localFilePath); // 임시 파일 삭제
        return updatedFile;
      } catch (e) {
        console.error(`Failed to process file ${file.key}:`, e);
        return null;
      }
    });

    const results = await Promise.all(uploadPromises);
    return results.filter((result) => result !== null);
  }

  async deleteFile(fileId: string) {
    const file = await this.fileRepository.findOneBy({ id: fileId });

    if (!file) {
      console.warn(
        `Attempted to delete a non-existent file with ID: ${fileId}`,
      );
      return;
    }

    if (file.status === FileStatus.PERMANENT) {
      try {
        await this.s3Service.delete(file.key);
      } catch (err) {
        console.error(`Failed to delete file from S3. Key: ${file.key}`, err);
      }
    }
    await this.fileRepository.remove(file);
  }
}
