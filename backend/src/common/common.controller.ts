import { Controller, Get } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { CommonService } from './common.service';

@Controller('common')
export class CommonController {
  constructor(private readonly commonService: CommonService) {}

  @ApiOperation({ description: '카테고리 목록 조회' })
  @Get('/category')
  async getCategories() {
    return await this.commonService.getCategories();
  }

  @ApiOperation({ description: '지역 목록 트리 구조로 조회' })
  @Get('/region')
  async getRegions() {
    return await this.commonService.getTreeRegions();
  }
}
