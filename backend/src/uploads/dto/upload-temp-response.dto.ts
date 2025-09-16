import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, IsUUID } from 'class-validator';
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

  @ApiProperty({ description: 'AI가 분석한 카테고리', required: false })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ description: 'AI가 분석한 품목명', required: false })
  @IsString()
  @IsOptional()
  itemName?: string;

  constructor(file: FileModel, analysisResult?: { category?: string; itemName?: string }) {
    this.id = file.id;
    this.tempUrl = file.url;
    this.category = analysisResult?.category;
    this.itemName = analysisResult?.itemName;
  }
}
