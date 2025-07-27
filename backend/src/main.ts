import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as process from 'node:process';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  if (process.argv.includes('--makedummy')) {
    console.log('makedummy start');
  } else {
    await app.listen(3000);
  }
}

bootstrap();
