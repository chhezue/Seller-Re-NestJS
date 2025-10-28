import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { AiDescriptionService } from './ai-description.service';
import { CreateDescriptionDto } from './dto/create-description.dto';
import { GetDescriptionDto } from './dto/get-description.dto';
import { AnalysisDescriptionRequestDto } from './dto/analysis-description.request.dto';
import { AnalysisDescriptionResponseDto } from './dto/analysis-description.response.dto';

@Controller('ai-description')
export class AiDescriptionController {
  constructor(private readonly aiDescriptionService: AiDescriptionService) {}

  @Post('/create')
  @ApiOperation({
    description:
      'AI 기반 상품 설명 자동 생성 (이미지 분석 + 검증 + 설명 생성 통합)',
  })
  async generateDescription(
    @Body() dto: CreateDescriptionDto,
  ): Promise<GetDescriptionDto> {
    return this.aiDescriptionService.generateDescription(dto);
  }

  @Post('/analysis')
  @ApiOperation({ description: 'AI 기반 상품 설명 분석' })
  async analysisDescription(
    @Body() dto: AnalysisDescriptionRequestDto,
  ): Promise<AnalysisDescriptionResponseDto> {
    return this.aiDescriptionService.analysisDescription(dto);
  }
}
