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
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductModel, RegionModel, ProductImageModel]),
    UsersModule,
    AuthModule,
    UploadsModule,
    LikesModule,
    CacheModule.register({
      ttl: 1800, // 30분
    }),
  ],
  controllers: [ProductController],
  providers: [ProductService, ViewCountSchedule],
  exports: [ProductService],
})
export class ProductModule {}
