import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private supabase: SupabaseClient;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const SUPABASE_ANON_KEY =
      this.configService.get<string>('SUPABASE_ANON_KEY');

    console.log('supabaseURL : ', supabaseUrl);
    console.log('SUPABASE_ANON_KEY : ', SUPABASE_ANON_KEY);

    if (!supabaseUrl || !SUPABASE_ANON_KEY) {
      throw new Error(
        'Supabase URL and Key must be provided in environment variables.',
      );
    }

    this.supabase = createClient(supabaseUrl, SUPABASE_ANON_KEY);
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }
}
