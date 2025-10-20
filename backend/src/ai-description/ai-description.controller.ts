import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AiDescriptionService } from './ai-description.service';
import { GenerateDescriptionDto } from './dto/generate-description.dto';
import { DescriptionResponseDto } from './dto/description-response.dto';

@ApiTags('AI Description')
@Controller('ai-description')
export class AiDescriptionController {
  constructor(private readonly aiDescriptionService: AiDescriptionService) {}

  @Post()
  @ApiOperation({
    summary:
      'AI 기반 상품 설명 자동 생성 (이미지 분석 + 검증 + 설명 생성 통합)',
  })
  @ApiResponse({ status: 201, type: DescriptionResponseDto })
  async generateDescription(
    @Body() dto: GenerateDescriptionDto,
  ): Promise<DescriptionResponseDto> {
    return this.aiDescriptionService.generateDescription(dto);
  }

  @Get('health')
  @ApiOperation({ summary: 'AI 이미지 분석 서버 상태 확인' })
  async checkHealth(): Promise<{ healthy: boolean }> {
    const healthy = await this.aiDescriptionService.checkHealth();
    return { healthy };
  }
}
