import { ApiProperty } from '@nestjs/swagger';
import { ImageAnalysisResultDto } from './image-analysis-result.dto';

// AI 설명 생성 API의 최종 응답 DTO
export class DescriptionResponseDto {
  @ApiProperty({ description: 'AI가 생성한 상품 설명' })
  description: string;

  @ApiProperty({
    description: 'AI 이미지 분석 결과 (확률 높은 순, 키워드 배열)',
  })
  aiAnalysis: ImageAnalysisResultDto;

  @ApiProperty({
    description: '카테고리 불일치 경고 메시지 (불일치가 없으면 null)',
  })
  warning: string | null;
}
