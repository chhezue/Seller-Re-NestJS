import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsUrl, IsUUID } from 'class-validator';
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
  
  @ApiProperty({ description: 'AI 분석 정확도', required: false })
  @IsNumber()
  @IsOptional()
  probability?: number;

  @ApiProperty({ description: '이미지 원본 분석 점수', required: false })
  @IsNumber()
  @IsOptional()
  origin_score?: number;

  @ApiProperty({ description: '이미지 원본 분류', required: false })
  @IsString()
  @IsOptional()
  origin_classification?: string;

  @ApiProperty({ description: '이미지 원본 가능성 (AI, 사용자 촬영, 인터넷 다운로드)', required: false })
  @IsOptional()
  origin_likelihood?: { user_taken?: number; internet_download?: number; ai_generated?: number };

  constructor(file: FileModel, analysisResult?: { category?: string; itemName?: string, probability?: number; origin_score?: number; origin_classification?: string; origin_likelihood?: { user_taken?: number; internet_download?: number; ai_generated?: number } }) {
    this.id = file.id;
    this.tempUrl = file.url;
    this.category = analysisResult?.category;
    this.itemName = analysisResult?.itemName;
    this.probability = analysisResult?.probability;
    this.origin_score = analysisResult?.origin_score;
    this.origin_classification = analysisResult?.origin_classification;
    this.origin_likelihood = analysisResult?.origin_likelihood;
  }
}
