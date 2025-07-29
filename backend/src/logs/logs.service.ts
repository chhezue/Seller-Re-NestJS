import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

// 이벤트와 함께 전달될 데이터의 타입을 정의하면 좋습니다.
export interface LoginFailedPayload {
  email: string;
  ip: string;
  timestamp: Date;
}

@Injectable()
export class LogsService {
  private readonly logger = new Logger(LogsService.name);

  // 'login.failed' 이벤트가 발생하면 이 메서드가 자동으로 호출됩니다.
  @OnEvent('login.failed')
  handleLoginFailedEvent(payload: LoginFailedPayload) {
    this.logger.warn(
      `[Login Failed] Email: ${payload.email} | IP: ${payload.ip} | Time: ${payload.timestamp.toISOString()}`,
    );

    // 여기에 실제 로그 파일 저장, DB 저장, 또는 외부 로깅 서비스(Sentry, Datadog)로
    // 전송하는 로직을 구현할 수 있습니다.
  }
}
