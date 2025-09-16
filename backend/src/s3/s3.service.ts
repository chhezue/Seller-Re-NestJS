import { Injectable, InternalServerErrorException } from '@nestjs/common';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';

// S3 업로드 로직
@Injectable()
export class S3Service {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly region: string;

  constructor(private readonly configService: ConfigService) {
    this.region = this.configService.get<string>('AWS_S3_REGION');
    this.bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME');

    // S3 클라이언트 초기화
    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get<string>(
          'AWS_SECRET_ACCESS_KEY',
        ),
      },
    });
  }

  // 일반 파일도 처리할 수 있게 범용적으로 구현
  async upload(key: string, fileBuffer: Buffer, mimetype: string) {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: fileBuffer,
      ContentType: mimetype,
      // ACL: 'public-read', // 퍼블릭 읽기 권한 설정
    });

    try {
      await this.s3Client.send(command);
      return `https://s3.${this.region}.amazonaws.com/${this.bucketName}/${key}`; // 성공 시 S3의 영구 주소 반환
    } catch (e) {
      console.error('S3 Upload Error:', e);
      throw new InternalServerErrorException(
        '파일을 S3에 업로드하는 데 실패했습니다.',
      );
    }
  }

  async delete(key: string) {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    try {
      await this.s3Client.send(command);
    } catch (err) {
      console.error('S3 Delete Error: ', err);
      // Only log the error without throwing it to prevent service interruption if the S3 deletion fails.
      // If necessary, you could throw the error to let the caller handle it.
    }
  }
}
