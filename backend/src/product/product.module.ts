import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductModel } from './entity/product.entity';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import { RegionModel } from '../common/entity/region.entity';
import { UploadsModule } from '../uploads/uploads.module';
import { ProductImageModel } from '../uploads/entity/product-image.entity';
import { LikesModule } from '../likes/likes.module';
import { ViewCountSchedule } from './schedule/view.count.schedule';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductModel, RegionModel, ProductImageModel]),
    UsersModule,
    AuthModule,
    UploadsModule,
    LikesModule,
    RedisModule, // Redis 클라이언트 사용을 위해 추가
  ],
  controllers: [ProductController],
  providers: [ProductService, ViewCountSchedule],
  exports: [ProductService],
})
export class ProductModule {}
