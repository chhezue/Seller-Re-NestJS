import { ApiProperty } from '@nestjs/swagger';

// 이미지 분석 결과 DTO (Python FastAPI의 응답과 1:1 매핑)
export class ImageAnalysisResultDto {
  @ApiProperty({
    description: 'AI가 감지한 키워드 배열 (확률 높은 순으로 정렬됨)',
  })
  keywords: Array<{
    keyword: string;
    probability: number;
  }>;
}
