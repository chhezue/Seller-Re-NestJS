import { ApiProperty } from '@nestjs/swagger';

// AI 설명 생성 API의 최종 응답 DTO
export class GetDescriptionDto {
  @ApiProperty({ description: 'AI가 생성한 상품 설명' })
  description: string;

  @ApiProperty({
    description: '카테고리 불일치 경고 메시지 (불일치가 없으면 null)',
  })
  warning: string | null;
}
