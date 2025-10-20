import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { AiDescriptionService } from './ai-description.service';
import { CreateDescriptionDto } from './dto/create-description.dto';
import { GetDescriptionDto } from './dto/get-description.dto';

@Controller('ai-description')
export class AiDescriptionController {
  constructor(private readonly aiDescriptionService: AiDescriptionService) {}

  @Post()
  @ApiOperation({
    summary:
      'AI 기반 상품 설명 자동 생성 (이미지 분석 + 검증 + 설명 생성 통합)',
  })
  async generateDescription(
    @Body() dto: CreateDescriptionDto,
  ): Promise<GetDescriptionDto> {
    return this.aiDescriptionService.generateDescription(dto);
  }
}
