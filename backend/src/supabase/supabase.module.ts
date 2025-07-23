import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseService } from './supabase.service';

@Module({
  imports: [ConfigModule], // ConfigModule을 import하여 ConfigService를 사용할 수 있도록 합니다.
  providers: [SupabaseService],
  exports: [SupabaseService],
})
export class SupabaseModule {}