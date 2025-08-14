import { Controller, Get } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { CommonService } from './common.service';
import { IsPublic } from './decorator/is-public.decorator';

@Controller('common')
@IsPublic()
export class CommonController {
  constructor(private readonly commonService: CommonService) {}

  @ApiOperation({ description: '카테고리 목록 조회' })
  @Get('/category')
  async getCategories() {
    return await this.commonService.getCategories();
  }

  @ApiOperation({ description: '지역 목록 트리 구조로 조회' })
  @Get('/region/tree')
  async getTreeRegions() {
    return await this.commonService.getTreeRegions();
  }

  @ApiOperation({ description: '지역 목록 플랫 구조로 조회' })
  @Get('/region/flat')
  async getFlatRegions() {
    return await this.commonService.getFlatRegions();
  }
}
