import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoryModel } from './entity/category.entity';
import { RegionModel } from './entity/region.entity';
import { CommonController } from './common.controller';
import { CommonService } from './common.service';
import { LoginAttemptLogAtFailedModel } from './entity/login-attempt-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CategoryModel,
      RegionModel,
      LoginAttemptLogAtFailedModel,
    ]),
  ],
  controllers: [CommonController],
  providers: [CommonService],
  exports: [CommonService],
})
export class CommonModule {}
