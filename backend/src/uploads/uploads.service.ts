import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { UploadTempResponseDto } from './dto/upload-temp-response.dto';
import { FileModel, FileStatus } from './entity/file.entity';
import { ImageCommitDto } from './dto/image-commit.dto';
import { S3Service } from '../s3/s3.service';
import * as path from 'node:path';
import { promises as fs } from 'fs';

@Injectable()
export class UploadsService {
  constructor(
    private readonly s3Service: S3Service,
    @InjectRepository(FileModel)
    private readonly fileRepository: Repository<FileModel>,
  ) {}

  async uploadTempFiles(
    files: Array<Express.Multer.File>,
  ): Promise<UploadTempResponseDto[]> {
    if (!files.length) {
      throw new BadRequestException('파일이 제공되지 않았습니다.');
    }

    const savedPromises = files.map((file) => {
      const newFile = this.fileRepository.create({
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        key: file.filename,
        url: `/uploads_temp/${file.filename}`, // 임시 접근 url
        status: FileStatus.TEMPORARY,
      });
      return this.fileRepository.save(newFile); // save는 프로미스 반환
    });

    // Promise.all을 사용해 모든 저장 작업을 병렬로 실행하고 완료될 때까지 기다림.
    const savedFiles = await Promise.all(savedPromises);

    return savedFiles.map(
      (fileEntity) => new UploadTempResponseDto(fileEntity),
    );
  }

  async commitFiles(imageDtos: ImageCommitDto[]): Promise<FileModel[]> {
    if (!imageDtos.length) {
      throw new BadRequestException('파일이 제공되지 않았습니다.');
    }

    // 1. DTO 배열에서 fileId들만 호출
    const fileIds = imageDtos.map((image) => image.fileId);

    // 2. In 연산자를 사용해 모든 파일 조회
    const files = await this.fileRepository.find({
      where: { id: In(fileIds) },
    });

    // 3. 요청한 ID의 파일이 모두 DB에 존재하는지 확인
    if (files.length !== fileIds.length) {
      throw new BadRequestException(
        '존재하지 않는 파일 ID가 포함되어 있습니다.',
      );
    }

    // 4. TEMPORARY 상태 확인
    files.forEach((file) => {
      if (file.status !== FileStatus.TEMPORARY) {
        throw new BadRequestException(
          '최종 파일 업로드는 TEMPORARY 상태일 때만 가능합니다.',
        );
      }
    });

    // 5. 각 파일을 S3에 업로드하고 DB를 업데이트하는 작업을 병렬로 처리
    const uploadPromises = files.map(async (file) => {
      const localFilePath = path.join(process.cwd(), 'uploads_temp', file.key);

      try {
        const fileBuffer = await fs.readFile(localFilePath);
        const s3Url = await this.s3Service.upload(
          file.key,
          fileBuffer,
          file.mimeType,
        );

        // S3에 저장된 정보를 바탕으로 파일 엔티티 업데이트
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
      //already deleted or invalid id.
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
