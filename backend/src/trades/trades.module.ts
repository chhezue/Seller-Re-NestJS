import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { Module } from '@nestjs/common';
import { ProductModel } from '../product/entity/product.entity';
import { TradesService } from './trades.service';
import { TradesController } from './trades.controller';

@Module({
  imports: [UsersModule, AuthModule, ProductModel],
  controllers: [TradesController],
  providers: [TradesService],
  exports: [TradesService],
})
export class TradesModule {}
