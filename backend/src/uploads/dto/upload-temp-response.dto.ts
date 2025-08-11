import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUrl, IsUUID } from 'class-validator';
import { FileModel } from '../entity/file.entity';

// 임시 업로드 API의 응답 형식을 정의하는 DTO
export class UploadTempResponseDto {
  @ApiProperty({
    description: '클라이언트가 최종 제출 시 보내줄 파일의 고유 ID',
  })
  @IsUUID()
  id: string;

  @ApiProperty({ description: '이미지 미리보기에 사용할 임시 url' })
  @IsString()
  @IsUrl()
  tempUrl: string;

  constructor(file: FileModel) {
    this.id = file.id;
    this.tempUrl = file.url;
  }
}
