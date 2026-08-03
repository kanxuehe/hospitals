import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCityDto } from './dto/create-city.dto';
import { UpdateCityDto } from './dto/update-city.dto';

@Injectable()
export class CityService {
  constructor(private prisma: PrismaService) {}

  async findAll(provinceCode?: string) {
    const where: any = {};
    if (provinceCode) {
      const province = await this.prisma.province.findUnique({
        where: { code: provinceCode },
      });
      if (province) {
        where.provinceId = province.id;
      }
    }

    return this.prisma.city.findMany({
      where,
      orderBy: [{ provinceId: 'asc' }, { sortOrder: 'asc' }],
      include: {
        province: { select: { id: true, name: true } },
        _count: {
          select: { hospitals: { where: { deletedAt: null } } },
        },
      },
    });
  }

  async create(dto: CreateCityDto, dataScope: { provinceIds: number[] | null }) {
    this.checkProvinceAccess(dto.provinceId, dataScope);

    const existingName = await this.prisma.city.findFirst({
      where: { provinceId: dto.provinceId, name: dto.name },
    });
    if (existingName) {
      throw new ConflictException('该省份下城市名称已存在');
    }

    const existingCode = await this.prisma.city.findUnique({
      where: { code: dto.code },
    });
    if (existingCode) {
      throw new ConflictException('城市编码已存在');
    }

    return this.prisma.city.create({ data: dto });
  }

  async update(id: number, dto: UpdateCityDto, dataScope: { provinceIds: number[] | null }) {
    const city = await this.ensureExists(id);
    this.checkProvinceAccess(city.provinceId, dataScope);

    return this.prisma.city.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: number, dataScope: { provinceIds: number[] | null }) {
    const city = await this.ensureExists(id);
    this.checkProvinceAccess(city.provinceId, dataScope);

    const hospitalCount = await this.prisma.hospital.count({
      where: { cityId: id, deletedAt: null },
    });
    if (hospitalCount > 0) {
      throw new ConflictException('该城市下还有医院，无法删除');
    }

    await this.prisma.city.delete({ where: { id } });
    return { message: '删除成功' };
  }

  private async ensureExists(id: number) {
    const city = await this.prisma.city.findUnique({ where: { id } });
    if (!city) throw new NotFoundException('城市不存在');
    return city;
  }

  private checkProvinceAccess(provinceId: number, dataScope: { provinceIds: number[] | null }) {
    if (dataScope.provinceIds !== null && !dataScope.provinceIds.includes(provinceId)) {
      throw new ForbiddenException('您无权操作该省份的数据');
    }
  }
}
