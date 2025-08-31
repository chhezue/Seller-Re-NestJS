import { ClassSerializerInterceptor, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupabaseModule } from './supabase/supabase.module';
import { ProductModule } from './product/product.module';
import { CommonModule } from './common/common.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { LogsModule } from './logs/logs.module';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AccessTokenGuard } from './auth/guard/bearer-token.guard';
import { CacheModule } from '@nestjs/cache-manager';
import { S3Module } from './s3/s3.module';
import { LikesModule } from './likes/likes.module';
import { ScheduleModule } from '@nestjs/schedule';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env.development',
    }),
    CacheModule.register({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule, EventEmitterModule.forRoot(), LogsModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: parseInt(config.get<string>('DB_PORT'), 10),
        username: config.get<string>('DB_USERNAME'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        ssl: {
          rejectUnauthorized:
            config.get<string>('DB_SSL_REJECT_UNAUTHORIZED') === 'true',
        },
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),
    SupabaseModule,
    ProductModule,
    CommonModule,
    UsersModule,
    AuthModule,
    ConfigModule,
    S3Module,
    ScheduleModule.forRoot(),
    LikesModule,
    RedisModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    //interceptor: use ClassSerializerInterceptor to transfer DTO
    {
      provide: APP_INTERCEPTOR,
      useClass: ClassSerializerInterceptor,
    },
    //guard: authentication and authorization
    {
      provide: APP_GUARD,
      useClass: AccessTokenGuard,
    },
    // TODO. implement rolesGuard
    // {
    //   provide: APP_GUARD, useClass: RolesGuard
    // }
  ],
})
export class AppModule {}
