import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoryModel } from './entity/category.entity';
import { RegionModel } from './entity/region.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CategoryModel, RegionModel])],
  controllers: [],
  providers: [],
  exports: [],
})
export class CommonModule {}
