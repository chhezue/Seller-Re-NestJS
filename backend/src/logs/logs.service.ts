import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

export interface LoginFailedPayload {
  email: string;
  ip: string;
  timestamp: Date;
}

@Injectable()
export class LogsService {
  private readonly logger = new Logger(LogsService.name);

  @OnEvent('login.failed')
  handleLoginFailedEvent(payload: LoginFailedPayload) {
    this.logger.warn(
      `[Login Failed] Email: ${payload.email} | IP: ${payload.ip} | Time: ${payload.timestamp.toISOString()}`,
    );

    // 여기에 실제 로그 파일 저장, DB 저장, 또는 외부 로깅 서비스(Sentry, Datadog)로
    // 전송하는 로직을 구현할 수 있습니다.

    //TODO. fail count ++
  }
}
