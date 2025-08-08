import { Injectable } from '@nestjs/common';
import { AwsS3Service } from './service/aws-s3.service';
import { ImageProcessingService } from './service/image-processing.service';

@Injectable()
export class UploadsService {
  constructor(
    private readonly awsS3Service: AwsS3Service,
    private readonly imageProcessingService: ImageProcessingService,
  ) {}

  // TODO: 파일 업로드 비즈니스 로직 구현
}
