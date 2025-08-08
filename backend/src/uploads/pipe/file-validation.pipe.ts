// 💧 파일 유효성 검증 파이프
import { Injectable, PipeTransform, ArgumentMetadata } from '@nestjs/common';

@Injectable()
export class FileValidationPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    // TODO: 파일 유효성 검증 로직 구현
    return value;
  }
}
