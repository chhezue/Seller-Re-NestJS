import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PageDto {
  @ApiProperty({ description: '커서 값 (ISO Date String)' })
  @IsOptional()
  @IsString()
  readonly cursor?: string;

  @ApiProperty({ description: '페이지당 항목 수' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  readonly limit?: number = 10;
}
