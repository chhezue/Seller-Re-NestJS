import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { UploadTempResponseDto } from './dto/upload-temp-response.dto';
import { FileModel, FileStatus } from './entity/file.entity';
import { ImageCommitDto } from './dto/image-commit.dto';
import { S3Service } from '../s3/s3.service';
import * as path from 'node:path';
import { promises as fs } from 'fs';
import { HttpService } from '@nestjs/axios';
import { CategoryModel } from '../common/entity/category.entity';
import { catchError, firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

// 1차 분석(카테고리)과 2차 분석(상세 품목)을 통합하여 정확도를 높이기 위한 새로운 상세 품목 목록
const subCategoryMap = {
  '디지털기기': ['스마트폰', '노트북', '태블릿', '카메라', '모니터', '키보드', '마우스', '오디오', '게임기'],
  '생활가전': ['냉장고', '세탁기', '에어컨', '청소기', '전자레인지', '밥솥', '공기청정기'],
  '가구/인테리어': ['침대', '소파', '테이블', '의자', '서랍장', '조명', '인테리어 소품'],
  '생활/주방': ['냄비', '그릇', '컵', '수저', '조리도구', '청소용품', '생활용품'],
  '유아동': ['장난감', '인형', '유아의류', '유모차', '카시트'],
  '유아도서': ['유아도서'],
  '여성의류': ['자켓', '블라우스', '티셔츠', '원피스', '스커트', '바지'],
  '여성잡화': ['가방', '신발', '지갑', '주얼리', '모자', '스카프'],
  '남성패션/잡화': ['자켓', '셔츠', '티셔츠', '바지', '신발', '가방', '지갑'],
  '뷰티/미용': ['스킨케어', '메이크업', '향수', '헤어용품', '네일'],
  '스포츠/레저': ['운동복', '운동화', '자전거', '골프', '캠핑', '낚시', '등산'],
  '식물': ['화분', '관엽식물', '다육식물', '꽃'],
  '취미/게임/음반': ['책', '음반', 'DVD', '게임타이틀', '피규어', '프라모델', '악기'],
  '도서': ['소설', '만화', '잡지', '전공서적', '자기계발서'],
  '티켓/교환권': ['티켓', '교환권'],
  '가공식품': ['가공식품'],
  '건강기능식품': ['건강기능식품'],
  '반려동물용품': ['사료', '간식', '장난감', '의류', '이동장'],
  '기타 중고물품': ['기타 중고물품'],
};

// 모든 소분류 아이템 리스트와 아이템-카테고리 역방향 맵 생성
const allLabels = Object.values(subCategoryMap).flat();
const itemToCategoryMap = Object.entries(subCategoryMap).reduce((acc, [category, items]) => {
  items.forEach(item => {
    acc[item] = category;
  });
  return acc;
}, {});

@Injectable()
export class UploadsService {
  private readonly analysisApiUrl = 'http://localhost:8001/analyze';

  constructor(
    private readonly s3Service: S3Service,
    @InjectRepository(FileModel)
    private readonly fileRepository: Repository<FileModel>,
    @InjectRepository(CategoryModel)
    private readonly categoryRepository: Repository<CategoryModel>,
    private readonly httpService: HttpService,
  ) {}

  private async analyzeImage(imagePath: string, labels: string[]): Promise<any> {
    const { data } = await firstValueFrom(
      this.httpService.post(this.analysisApiUrl, {
        image_path: imagePath,
        labels,
      }).pipe(
        catchError((error: AxiosError) => {
          const errorData = error.response?.data || 'Unknown error';
          console.error(`AI 서버 통신 오류: ${JSON.stringify(errorData)}`);
          throw new InternalServerErrorException('AI 분석 서버와 통신하는 중 오류가 발생했습니다.');
        }),
      ),
    );
    return data;
  }

  async uploadTempFiles(
    files: Array<Express.Multer.File>,
  ): Promise<UploadTempResponseDto[]> {
    if (!files.length) {
      throw new BadRequestException('파일이 제공되지 않았습니다.');
    }

    const savedPromises = files.map((file) => {
      const newFile = this.fileRepository.create({
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        key: file.filename,
        url: `/uploads_temp/${file.filename}`, // 임시 접근 url
        status: FileStatus.TEMPORARY,
      });
      return this.fileRepository.save(newFile); // save는 프로미스 반환
    });

    const savedFiles = await Promise.all(savedPromises);

    return savedFiles.map(
      (fileEntity) => new UploadTempResponseDto(fileEntity),
    );
  }
  
  async uploadTempProductFiles(
    files: Array<Express.Multer.File>,
  ): Promise<UploadTempResponseDto[]> {
    if (!files.length) {
      throw new BadRequestException('파일이 제공되지 않았습니다.');
    }

    const savedPromises = files.map(async (file) => {
      const newFile = this.fileRepository.create({
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        key: file.filename,
        url: `/uploads_temp/${file.filename}`,
        status: FileStatus.TEMPORARY,
      });
      const savedFile = await this.fileRepository.save(newFile);

      let analysisResult: { category?: string; itemName?: string } = {};

      try {
        const imageFullPath = path.join(process.cwd(), 'uploads_temp', savedFile.key);

        // 모든 소분류 아이템을 대상으로 단일 분석 수행
        const itemAnalysis = await this.analyzeImage(imageFullPath, allLabels);

        // 분석 결과 로그 기록 (상위 5개)
        console.log(`--- 이미지 분석 결과 (파일: ${file.filename}) ---`);
        itemAnalysis.results.slice(0, 5).forEach(result => {
          const percentage = (result.probability * 100).toFixed(2);
          console.log(`- ${result.keyword}: ${percentage}%`);
        });
        console.log('-------------------------------------------');

        const topItem = itemAnalysis.results[0]?.keyword;

        if (topItem) {
          // 결과에서 대분류와 소분류(아이템명) 설정
          analysisResult.category = itemToCategoryMap[topItem];
          analysisResult.itemName = topItem;
        }
      } catch (e) {
        console.error(`이미지 분석 실패 (파일: ${file.filename}): ${e.message}`);
      }

      return new UploadTempResponseDto(savedFile, analysisResult);
    });

    return Promise.all(savedPromises);
  }

  async commitFiles(imageDtos: ImageCommitDto[]): Promise<FileModel[]> {
    if (!imageDtos.length) {
      throw new BadRequestException('파일이 제공되지 않았습니다.');
    }

    const fileIds = imageDtos.map((image) => image.fileId);

    const files = await this.fileRepository.find({
      where: { id: In(fileIds) },
    });

    if (files.length !== fileIds.length) {
      throw new BadRequestException(
        '존재하지 않는 파일 ID가 포함되어 있습니다.',
      );
    }

    files.forEach((file) => {
      if (file.status !== FileStatus.TEMPORARY) {
        throw new BadRequestException(
          '최종 파일 업로드는 TEMPORARY 상태일 때만 가능합니다.',
        );
      }
    });

    const uploadPromises = files.map(async (file) => {
      const localFilePath = path.join(process.cwd(), 'uploads_temp', file.key);

      try {
        const fileBuffer = await fs.readFile(localFilePath);
        const s3Url = await this.s3Service.upload(
          file.key,
          fileBuffer,
          file.mimeType,
        );

        file.status = FileStatus.PERMANENT;
        file.url = s3Url;

        const updatedFile = await this.fileRepository.save(file);
        await fs.unlink(localFilePath); // 임시 파일 삭제
        return updatedFile;
      } catch (e) {
        console.error(`Failed to process file ${file.key}:`, e);
        return null;
      }
    });

    const results = await Promise.all(uploadPromises);
    return results.filter((result) => result !== null);
  }

  async deleteFile(fileId: string) {
    const file = await this.fileRepository.findOneBy({ id: fileId });

    if (!file) {
      console.warn(
        `Attempted to delete a non-existent file with ID: ${fileId}`,
      );
      return;
    }

    if (file.status === FileStatus.PERMANENT) {
      try {
        await this.s3Service.delete(file.key);
      } catch (err) {
        console.error(`Failed to delete file from S3. Key: ${file.key}`, err);
      }
    }
    await this.fileRepository.remove(file);
  }
}
