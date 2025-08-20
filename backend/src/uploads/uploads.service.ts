import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
// import { AwsS3Service } from './service/aws-s3.service';
// import { ImageProcessingService } from './service/image-processing.service';
import { Repository } from 'typeorm';
import { UploadTempResponseDto } from './dto/upload-temp-response.dto';
import { FileModel, FileStatus } from './entity/file.entity';

@Injectable()
export class UploadsService {
  constructor(
    //   private readonly awsS3Service: AwsS3Service,
    //   private readonly imageProcessingService: ImageProcessingService,
    @InjectRepository(FileModel)
    private readonly fileRepository: Repository<FileModel>,
  ) {}

  async uploadTempFiles(
    files: Array<Express.Multer.File>,
  ): Promise<UploadTempResponseDto[]> {
    if (!files || !files.length) {
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
}
