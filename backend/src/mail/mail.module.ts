import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EjsAdapter } from '@nestjs-modules/mailer/dist/adapters/ejs.adapter';
import { MailService } from './mail.service';
import * as path from 'path';
import { MailListener } from './mail.listener';

@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const fromName = configService.get<string>('MAIL_FROM');
        const fromEmail = configService.get<string>('MAIL_USER');

        const templateDir = path.join(__dirname, '..', '..', 'templates');

        return {
          transport: {
            host: configService.get<string>('MAIL_HOST'),
            secure: false,
            auth: {
              user: fromEmail,
              pass: configService.get<string>('MAIL_PASSWORD'),
            },
          },
          defaults: {
            from: `"${fromName}" <${fromEmail}>`,
          },
          template: {
            dir: templateDir,
            adapter: new EjsAdapter(),
            options: {
              strict: false,
            },
          },
        };
      },
    }),
  ],
  providers: [MailService, MailListener],
  exports: [MailService],
})
export class MailModule {}
