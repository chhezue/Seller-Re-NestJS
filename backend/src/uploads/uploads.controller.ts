import {
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { UploadsService } from './uploads.service';
import { ApiOperation } from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { UploadTempResponseDto } from './dto/upload-temp-response.dto';
import { IsPublic } from '../common/decorator/is-public.decorator';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @ApiOperation({
    description: '파일을 uploads_temp에 저장하고 임시 경로를 반환',
  })
  @IsPublic()
  @Post('/temp')
  @UseInterceptors(FilesInterceptor('files', 5)) // form-data의 'file' 필드를 받음.
  async uploadTempFile(
    @UploadedFiles() files: Array<Express.Multer.File>,
  ): Promise<UploadTempResponseDto[]> {
    return await this.uploadsService.uploadTempFiles(files);
  }
}
