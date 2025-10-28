import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { CategoryModel } from '../common/entity/category.entity';
import { CreateDescriptionDto } from './dto/create-description.dto';
import { GetDescriptionDto } from './dto/get-description.dto';
import { AnalysisDescriptionRequestDto } from './dto/analysis-description.request.dto';
import { AnalysisDescriptionResponseDto } from './dto/analysis-description.response.dto';

@Injectable()
export class AiDescriptionService {
  private readonly logger = new Logger(AiDescriptionService.name);
  private readonly imageAnalysisApiUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @InjectRepository(CategoryModel)
    private readonly categoryRepository: Repository<CategoryModel>,
  ) {
    this.imageAnalysisApiUrl =
      this.configService.get<string>('IMAGE_ANALYSIS_API_URL') ||
      'http://localhost:8001';
  }

  // AI 기반 상품 설명 생성 (통합 API)
  // Python에서 모든 AI 처리를 수행: 이미지 분석 → 검증 → 설명 & 경고 메세지 생성
  async generateDescription(
    dto: CreateDescriptionDto,
  ): Promise<GetDescriptionDto> {
    this.logger.log(
      `AI 설명 생성 시작: ${dto.name} (이미지: ${dto.imageUrls.length}개)`,
    );

    try {
      // Step 1: 카테고리 정보 조회 (NestJS에서 DB 접근)
      this.logger.debug('Step 1: 카테고리 정보 조회 중...');
      const category = await this.categoryRepository.findOne({
        where: { id: dto.categoryId },
      });

      if (!category) {
        throw new HttpException(
          `카테고리를 찾을 수 없습니다: ${dto.categoryId}`,
          HttpStatus.NOT_FOUND,
        );
      }

      // Step 2: Python API 통합 호출
      // (이미지 분석 + 카테고리 검증 + 설명 생성 모두 Python에서 처리)
      this.logger.debug(
        'Step 2: Python API 호출 (이미지 분석 + 검증 + 설명 생성)...',
      );

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.imageAnalysisApiUrl}/generate-description`,
          {
            name: dto.name,
            category_name: category.name,
            condition: dto.condition,
            image_urls: dto.imageUrls,
          },
        ),
      );

      const result: GetDescriptionDto = {
        description: response.data.description,
        warning: response.data.warning || null,
      };

      this.logger.log(
        `AI 설명 생성 완료 (경고: ${result.warning ? '있음' : '없음'})`,
      );

      return result;
    } catch (error) {
      this.logger.error('AI 설명 생성 중 오류 발생:', error);

      if (error.code === 'ECONNREFUSED') {
        throw new HttpException(
          'AI 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      if (error.response) {
        throw new HttpException(
          `AI 서버 오류: ${error.response.data?.detail || error.message}`,
          error.response.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      throw new HttpException(
        'AI 설명 생성 중 예상치 못한 오류가 발생했습니다.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async analysisDescription(
    dto: AnalysisDescriptionRequestDto,
  ): Promise<AnalysisDescriptionResponseDto> {
    this.logger.log(`AI 설명 분석 시작: ${dto.name}`);

    try {
      this.logger.debug('Python API 호출 (설명 분석)...');

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.imageAnalysisApiUrl}/analysis-description`,
          {
            name: dto.name,
            condition: dto.condition,
            description: dto.description,
          },
        ),
      );

      const result: AnalysisDescriptionResponseDto = {
        conditionFeedback: response.data.conditionFeedback,
        requiredInfoFeedback: response.data.requiredInfoFeedback,
        forbiddenWordsFeedback: response.data.forbiddenWordsFeedback,
      };

      this.logger.log('AI 설명 분석 완료');

      return result;
    } catch (error) {
      this.logger.error('AI 설명 분석 중 오류 발생:', error);

      if (error.code === 'ECONNREFUSED') {
        throw new HttpException(
          'AI 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      if (error.response) {
        throw new HttpException(
          `AI 서버 오류: ${error.response.data?.detail || error.message}`,
          error.response.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      throw new HttpException(
        'AI 설명 분석 중 예상치 못한 오류가 발생했습니다.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
