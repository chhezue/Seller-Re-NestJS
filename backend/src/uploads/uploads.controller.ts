import { Controller } from '@nestjs/common';
import { UploadsService } from './uploads.service';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  // TODO: 파일 업로드 관련 엔드포인트 구현
}
