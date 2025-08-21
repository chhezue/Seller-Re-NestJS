import {
  Body,
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
import { ImageCommitDto } from './dto/image-commit.dto';
import { FileModel } from './entity/file.entity';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  // TODO IsPublic 데코레이터 제거
  @ApiOperation({
    description: '파일을 uploads_temp에 저장하고 임시 경로를 반환',
  })
  @IsPublic()
  @Post('/temp')
  @UseInterceptors(FilesInterceptor('files', 5)) // form-data의 'file' 필드를 받음.
  async uploadTempFiles(
    @UploadedFiles() files: Array<Express.Multer.File>,
  ): Promise<UploadTempResponseDto[]> {
    return await this.uploadsService.uploadTempFiles(files);
  }

  @ApiOperation({ description: '임시 파일을 S3에 영구 저장' })
  @IsPublic()
  @Post('/commit')
  async commitFiles(@Body() imageDtos: ImageCommitDto[]): Promise<FileModel[]> {
    return await this.uploadsService.commitFiles(imageDtos);
  }
}
