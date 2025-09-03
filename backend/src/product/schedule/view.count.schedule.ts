import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { ProductModel } from '../entity/product.entity';
import { Repository } from 'typeorm';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';

// 스케줄러는 인-메모리 캐시를 읽어 DB에 업데이트함.
@Injectable()
export class ViewCountSchedule {
  private readonly logger = new Logger(ViewCountSchedule.name);

  constructor(
    @InjectRepository(ProductModel)
    private readonly productRepository: Repository<ProductModel>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES) // 10분마다 실행
  // @Cron(CronExpression.EVERY_MINUTE) // 테스트: 1분마다 실행
  async handleViewCount() {
    this.logger.debug('Running view count update from in-memory cache...');

    const dirtyListKey = 'dirty:product:views';
    const dirtyList =
      (await this.cacheManager.get<Set<string>>(dirtyListKey)) ||
      new Set<string>(); // dirtyList는 productId 목록이 저장된 집합

    if (dirtyList.size === 0) {
      this.logger.debug('No views to update.');
      return;
    }

    for (const productId of dirtyList) {
      const viewCountKey = `product:views:${productId}`;
      const viewCount =
        (await this.cacheManager.get<number>(viewCountKey)) || 0; // 사용자 A, B, C가 전부 조회한 횟수

      if (viewCount > 0) {
        // 1. DB에 조회수 업데이트
        await this.productRepository.update(
          { id: productId },
          { views: () => `views + ${viewCount}` },
        );

        // 2. 캐시의 카운터 초기화
        await this.cacheManager.set(viewCountKey, 0);
      }
    }

    // 3. 완료 처리된 목록 초기화
    await this.cacheManager.del(dirtyListKey);
    this.logger.debug(`Updated views for ${dirtyList.size} products.`);
  }
}
