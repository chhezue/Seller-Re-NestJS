import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { RegionModel } from './entity/region.entity';
import { CategoryModel } from './entity/category.entity';

@Injectable()
export class CommonService {
  constructor(
    @InjectRepository(RegionModel)
    private readonly regionRepository: Repository<RegionModel>,
    @InjectRepository(CategoryModel)
    private readonly categoryRepository: Repository<CategoryModel>,
  ) {}

  async getCategories() {
    return await this.categoryRepository.find({
      select: ['id', 'name'],
    });
  }

  async getTreeRegions(): Promise<any[]> {
    const allRegions = await this.regionRepository.find();
    const topRegions = allRegions.filter((region) => region.parentId === null); // 부모 지역 필터링
    const result = [];

    for (const parent of topRegions) {
      const children = allRegions.filter(
        (region) => region.parentId === parent.id,
      );

      result.push({
        id: parent.id,
        name: parent.name,
        parentId: parent.parentId,
        children: children.map((child) => ({
          id: child.id,
          name: child.name,
          parentId: child.parentId,
        })),
      });
    }

    return result;
  }
}
