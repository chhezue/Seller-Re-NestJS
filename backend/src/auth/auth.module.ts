import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { BasicTokenGuard } from './guard/basic-token.guard';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshTokenModel } from './entity/refresh-token.entity';

@Module({
  imports: [
    UsersModule,
    JwtModule.register({}),
    TypeOrmModule.forFeature([RefreshTokenModel]),
  ],
  controllers: [AuthController],
  providers: [AuthService, BasicTokenGuard],
  exports: [AuthService],
})
export class AuthModule {}
