import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Redis } from 'ioredis';
import { InjectRepository } from '@nestjs/typeorm';
import { ProductModel } from '../entity/product.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ViewCountSchedule {
  private readonly logger = new Logger(ViewCountSchedule.name);

  constructor(
    @InjectRepository(ProductModel)
    private readonly productRepository: Repository<ProductModel>,
    @Inject('REDIS_CLIENT') private readonly redisClient: Redis,
  ) {}

  @Cron(CronExpression.EVERY_30_SECONDS) // 30초마다 실행
  async handleViewCount() {
    this.logger.debug('Running viewCount increacement...');
    // 1. Redis에서 조회수 키를 모두 스캔
    const keys = await this.redisClient.keys('product:views:*');

    for (const key of keys) {
      const productId = key.split(':')[2];
      const viewCount = await this.redisClient.get(key);

      // 2. DB 업데이트
      await this.productRepository.update(
        { id: productId },
        { views: () => `views + ${viewCount}` },
      );

      // 3. Redis 카운터 초기화
      await this.redisClient.set(key, '0');
    }
  }
}
