import {
  Controller,
  FileTypeValidator,
  MaxFileSizeValidator,
  ParseFilePipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { UploadsService } from './uploads.service';
import { ApiOperation } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadTempResponseDto } from './dto/upload-temp-response.dto';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @ApiOperation({
    description: '파일을 uploads_temp에 저장하고 임시 경로를 반환',
  })
  @Post('/temp')
  @UseInterceptors(FileInterceptor('file')) // form-data의 'file' 필드를 받음.
  async uploadTempFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10mb
          new FileTypeValidator({ fileType: '.(png|jpg|jpeg)' }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<UploadTempResponseDto> {
    return this.uploadsService.uploadTempFile(file);
  }
}
