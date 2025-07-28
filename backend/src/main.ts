import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as process from 'node:process';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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

  if (process.argv.includes('--makedummy')) {
    console.log('makedummy start');
  } else {
    await app.listen(3000);
  }
}

bootstrap();
