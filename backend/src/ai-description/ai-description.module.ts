import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AiDescriptionController } from './ai-description.controller';
import { AiDescriptionService } from './ai-description.service';
import { CategoryModel } from '../common/entity/category.entity';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    ConfigModule,
    TypeOrmModule.forFeature([CategoryModel]),
  ],
  controllers: [AiDescriptionController],
  providers: [AiDescriptionService],
  exports: [AiDescriptionService],
})
export class AiDescriptionModule {}
