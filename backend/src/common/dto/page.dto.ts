import { Type } from 'class-transformer';
import { IsNumber, IsOptional } from 'class-validator';

export class PageDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  readonly cursor?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  readonly limit?: number = 10;
}
