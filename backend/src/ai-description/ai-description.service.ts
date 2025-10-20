import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { GenerateDescriptionDto, DescriptionResponseDto, ImageAnalysisResultDto } from './dto';
import { CategoryModel } from '../common/entity/category.entity';

@Injectable()
export class AiDescriptionService {
  private readonly logger = new Logger(AiDescriptionService.name);
  private readonly imageAnalysisApiUrl: string;
  private readonly openaiApiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @InjectRepository(CategoryModel)
    private readonly categoryRepository: Repository<CategoryModel>,
  ) {
    this.imageAnalysisApiUrl =
      this.configService.get<string>('IMAGE_ANALYSIS_API_URL') ||
      'http://localhost:8001';
    this.openaiApiKey = this.configService.get<string>('OPENAI_API_KEY');
  }

  /**
   * 제품 정보와 이미지를 기반으로 AI 설명을 생성합니다.
   */
  async generateDescription(
    dto: GenerateDescriptionDto,
  ): Promise<DescriptionResponseDto> {
    this.logger.log(
      `AI 설명 생성 시작: ${dto.name} (이미지: ${dto.imageUrls.length}개)`,
    );

    try {
      // Step 1: 이미지 분석
      this.logger.debug('Step 1: 이미지 분석 중...');
      const aiAnalysis = await this.analyzeImages(dto.imageUrls);

      // Step 2: 카테고리 정보 조회
      this.logger.debug('Step 2: 카테고리 정보 조회 중...');
      const category = await this.categoryRepository.findOne({
        where: { id: dto.categoryId },
      });

      if (!category) {
        throw new HttpException(
          `카테고리를 찾을 수 없습니다: ${dto.categoryId}`,
          HttpStatus.NOT_FOUND,
        );
      }

      // Step 3: 카테고리 불일치 검사
      this.logger.debug('Step 3: 카테고리 검증 중...');
      const warning = this.checkCategoryMismatch(aiAnalysis, category.name);

      // Step 4: LLM 기반 설명 생성
      this.logger.debug('Step 4: 설명 생성 중...');
      const keywords = aiAnalysis.keywords.map((k) => k.keyword);
      const description = await this.generateDescriptionText(
        dto.name,
        category.name,
        dto.condition,
        keywords,
      );

      // Step 5: 최종 응답 구성
      const response: DescriptionResponseDto = {
        description,
        aiAnalysis,
        warning,
      };

      this.logger.log(
        `AI 설명 생성 완료 (경고: ${warning ? '있음' : '없음'})`,
      );

      return response;
    } catch (error) {
      this.logger.error('AI 설명 생성 중 오류 발생:', error);
      throw error;
    }
  }

  /**
   * Python FastAPI를 호출하여 이미지를 분석합니다.
   */
  private async analyzeImages(
    imageUrls: string[],
  ): Promise<ImageAnalysisResultDto> {
    try {
      this.logger.log(`이미지 분석 요청: ${imageUrls.length}개의 이미지`);

      const response = await firstValueFrom(
        this.httpService.post(`${this.imageAnalysisApiUrl}/analyze`, {
          image_paths: imageUrls,
        }),
      );

      const pythonResponse = response.data;

      if (!pythonResponse.results || pythonResponse.results.length === 0) {
        throw new Error('Python API에서 분석 결과를 반환하지 않았습니다.');
      }

      const result: ImageAnalysisResultDto = {
        keywords: pythonResponse.results.map((item: any) => ({
          keyword: item.keyword,
          probability: item.probability,
        })),
      };

      this.logger.log(
        `이미지 분석 완료: topCategory=${result.keywords[0].keyword}, confidence=${result.keywords[0].probability}`,
      );

      return result;
    } catch (error) {
      this.logger.error('이미지 분석 중 오류 발생:', error);

      if (error.code === 'ECONNREFUSED') {
        throw new HttpException(
          'AI 이미지 분석 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      if (error.response) {
        throw new HttpException(
          `이미지 분석 실패: ${error.response.data.detail || error.message}`,
          error.response.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      throw new HttpException(
        '이미지 분석 중 예상치 못한 오류가 발생했습니다.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * AI 분석 카테고리와 사용자 선택 카테고리를 비교하여 경고를 생성합니다.
   */
  private checkCategoryMismatch(
    aiResult: ImageAnalysisResultDto,
    userCategoryName: string,
  ): string | null {
    if (!aiResult.keywords || aiResult.keywords.length === 0) {
      return null;
    }

    const topKeyword = aiResult.keywords[0];
    const aiCategory = topKeyword.keyword.toLowerCase();
    const userCategory = userCategoryName.toLowerCase();

    // 카테고리명이 유사한지 검사
    const isMatch =
      aiCategory.includes(userCategory) ||
      userCategory.includes(aiCategory);

    if (isMatch) {
      this.logger.log(
        `카테고리 일치: AI="${topKeyword.keyword}", 사용자="${userCategoryName}"`,
      );
      return null;
    }

    // 신뢰도가 너무 낮으면 경고 안 함
    if (topKeyword.probability < 0.5) {
      this.logger.log(`신뢰도 낮아 경고 생략: ${topKeyword.probability}`);
      return null;
    }

    // 불일치 경고 메시지 생성
    this.logger.warn(
      `카테고리 불일치 감지: AI="${topKeyword.keyword}", 사용자="${userCategoryName}"`,
    );

    return `이미지 분석 결과는 "${topKeyword.keyword}"으로 보이지만, "${userCategoryName}" 카테고리로 등록하셨습니다. 카테고리를 다시 확인해주세요.`;
  }

  /**
   * 제품 정보와 AI 키워드를 기반으로 상품 설명을 생성합니다.
   * TODO: OpenAI/Claude API 연동 필요 (현재는 템플릿 기반)
   */
  private async generateDescriptionText(
    productName: string,
    categoryName: string,
    condition: string,
    keywords: string[],
  ): Promise<string> {
    this.logger.log(
      `설명 생성 시작: ${productName} (카테고리: ${categoryName})`,
    );

    // TODO: 실제 LLM API 호출로 교체 필요
    // 현재는 템플릿 기반 간단 구현
    const conditionDescriptions = {
      NEW: '새 제품으로, 한 번도 사용하지 않았습니다',
      LIKE_NEW: '거의 새것 같은 상태로, 사용감이 거의 없습니다',
      USED: '사용감이 있지만 정상적으로 사용 가능합니다',
      FOR_PARTS: '부품용으로 적합한 상태입니다',
    };

    const conditionText =
      conditionDescriptions[condition] || '상태가 좋습니다';

    const keywordText =
      keywords.length > 0
        ? ` ${keywords.slice(0, 2).join('/')} 제품입니다.`
        : '';

    const description = `${productName}${keywordText} ${conditionText}. 관심 있으신 분들의 많은 연락 부탁드립니다.`;

    this.logger.log('설명 생성 완료');
    return description;
  }

  /**
   * Python API 서버의 상태를 확인합니다.
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.imageAnalysisApiUrl}/`),
      );
      return response.status === 200;
    } catch (error) {
      this.logger.warn('Python API 서버 상태 확인 실패:', error.message);
      return false;
    }
  }
}
