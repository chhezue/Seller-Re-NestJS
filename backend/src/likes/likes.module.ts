import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LikesService } from './likes.service';
import { LikesController } from './likes.controller';
import { LikeModel } from './entity/like.entity';
import { ProductModel } from '../product/entity/product.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LikeModel, ProductModel])],
  controllers: [LikesController],
  providers: [LikesService],
  exports: [LikesService],
})
export class LikesModule {}
