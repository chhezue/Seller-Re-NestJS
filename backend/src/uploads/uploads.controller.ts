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
    description: '상품 이미지 임시 저장 및 AI 분석 실행',
  })
  @Post('/temp')
  @UseInterceptors(FilesInterceptor('files', 5))
  async uploadTempFiles(
    @UploadedFiles() files: Array<Express.Multer.File>,
  ): Promise<UploadTempResponseDto[]> {
    return await this.uploadsService.uploadTempProductFiles(files);
  }

  @ApiOperation({
    description: '사용자 프로필 이미지 임시 저장',
  })
  @Post('/tempUserImage')
  @IsPublic()
  @UseInterceptors(FilesInterceptor('files', 5))
  async uploadTempFilesForUserImage(
    @UploadedFiles() files: Array<Express.Multer.File>,
  ): Promise<UploadTempResponseDto[]> {
    return await this.uploadsService.uploadTempFiles(files);
  }
}
