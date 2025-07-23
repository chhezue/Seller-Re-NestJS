import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import * as process from 'node:process';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ConfigService 인스턴스 가져오기
  const configService = app.get(ConfigService);

  // 환경 변수 확인용 로그
  console.log('✅ Supabase URL:', configService.get('SUPABASE_URL'));
  console.log('✅ Supabase Key:', configService.get('SUPABASE_ANON_KEY'));

  if (process.argv.includes('--makedummy')) {
    console.log('makedummy start');
  } else {
    await app.listen(3000);
  }
}

bootstrap();
