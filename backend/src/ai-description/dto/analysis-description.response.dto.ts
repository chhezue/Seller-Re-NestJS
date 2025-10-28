import { ApiProperty } from '@nestjs/swagger';

export class AnalysisDescriptionResponseDto {
  @ApiProperty({ description: '사용감 항목에 대한 분석 피드백' })
  conditionFeedback: string;

  @ApiProperty({ description: '필수 정보 항목에 대한 분석 피드백' })
  requiredInfoFeedback: string;

  @ApiProperty({ description: '금칙어 항목에 대한 분석 피드백' })
  forbiddenWordsFeedback: string;
}
