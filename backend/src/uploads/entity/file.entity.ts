import { Column, Entity } from 'typeorm';
import { BaseModel } from '../../common/entity/base.entity';

export enum FileStatus {
  TEMPORARY = 'TEMPORARY',
  PERMANENT = 'PERMANENT',
}

// 파일 메타데이터 저장 엔티티
@Entity()
export class FileModel extends BaseModel {
  @Column()
  originalName: string; // 사용자가 업로드한 파일의 원래 파일명

  @Column()
  mimeType: string; // 파일의 형식

  @Column()
  size: number; // 바이트 단위

  @Column({ unique: true, nullable: false })
  key: string; // 클라우드 스토리지(예: AWS S3)에 저장된 파일의 고유 식별 키

  @Column()
  url: string; // 클라우드 스토리지에 저장된 파일에 접근할 수 있는 공개 URL

  @Column({ default: FileStatus.TEMPORARY })
  status: FileStatus;
}
