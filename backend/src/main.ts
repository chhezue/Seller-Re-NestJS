import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { initializeTransactionalContext } from 'typeorm-transactional';

async function bootstrap() {
  initializeTransactionalContext(); // 트랜잭션 데코레이터를 위한 전역 설정

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix('api');

  // ValidationPipe 전역 설정
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // DTO 변환 활성화
      whitelist: true, // 정의되지 않은 속성 제거
      forbidNonWhitelisted: true, // 정의되지 않은 속성이 있으면 에러
    }),
  );

  // CORS 설정
  app.enableCors({
    origin: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    credentials: true,
  });

  // Swagger 설정
  const config = new DocumentBuilder()
    .setTitle('MOIJANG SWAGGER') // 문서 제목
    .setVersion('1.0') // 버전
    .build();

  // Swagger UI 경로 설정
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  app.set('trust proxy', true);

  await app.listen(3000);
}

bootstrap();
