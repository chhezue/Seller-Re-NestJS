// 파일 최종 저장용 DTO
import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

export class ImageCommitDto {
  @ApiProperty({ description: '이미지 UUID' })
  @IsNotEmpty()
  @IsUUID()
  fileId: string;

  @ApiProperty({ description: '대표 이미지(썸네일) 여부' })
  @IsNotEmpty()
  @IsBoolean()
  isRepresentative: boolean;

  @ApiProperty({ description: '이미지의 노출 순서' })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  order: number;

  @ApiProperty({ description: '수정 시 새 이미지를 구분하는 플래그' })
  @IsBoolean()
  @IsOptional()
  isNew: boolean;
}
