import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
// import { AwsS3Service } from './service/aws-s3.service';
// import { ImageProcessingService } from './service/image-processing.service';
import { FileModel, FileStatus } from './entity/file.entity';
import { Repository } from 'typeorm';
import { UploadTempResponseDto } from './dto/upload-temp-response.dto';

@Injectable()
export class UploadsService {
  constructor(
    //   private readonly awsS3Service: AwsS3Service,
    //   private readonly imageProcessingService: ImageProcessingService,
    @InjectRepository(FileModel)
    private readonly fileRepository: Repository<FileModel>,
  ) {}

  async uploadTempFile(
    file: Express.Multer.File,
  ): Promise<UploadTempResponseDto> {
    if (!file) {
      throw new BadRequestException('파일이 제공되지 않았습니다.');
    }

    const newFile = this.fileRepository.create({
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      key: file.filename,
      status: FileStatus.TEMPORARY,
      url: `/uploads_temp/${file.filename}`, // 임시 접근 url
    });
    const savedFile = await this.fileRepository.save(newFile);

    return new UploadTempResponseDto(savedFile);
  }
}
