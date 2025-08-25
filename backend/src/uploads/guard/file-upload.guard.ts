// 🛡️ 파일 타입/크기 검증 (범용)
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class FileUploadGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // TODO: 파일 타입/크기 검증 로직 구현
    return true;
  }
}
