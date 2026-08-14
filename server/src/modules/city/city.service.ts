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
      where.provinceCode = provinceCode;
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
    // 通过 provinceCode 查询省份
    const province = await this.prisma.province.findUnique({
      where: { code: dto.provinceCode },
    });
    if (!province) {
      throw new NotFoundException('省份不存在');
    }

    this.checkProvinceAccess(province.id, dataScope);

    const existingName = await this.prisma.city.findFirst({
      where: { provinceId: province.id, name: dto.name },
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

    const { provinceCode, ...rest } = dto;
    return this.prisma.city.create({
      data: { ...rest, provinceId: province.id, provinceCode: province.code },
    });
  }

  async update(id: number, dto: UpdateCityDto, dataScope: { provinceIds: number[] | null }) {
    const city = await this.ensureExists(id);
    this.checkProvinceAccess(city.provinceId, dataScope);

    // 如果切换了省份，通过 provinceCode 查询新省份
    let provinceId = city.provinceId;
    let provinceCode = city.provinceCode;
    if (dto.provinceCode && dto.provinceCode !== city.provinceCode) {
      const province = await this.prisma.province.findUnique({
        where: { code: dto.provinceCode },
      });
      if (!province) {
        throw new NotFoundException('省份不存在');
      }
      this.checkProvinceAccess(province.id, dataScope);
      provinceId = province.id;
      provinceCode = province.code;
    }

    const { provinceCode: _omit, ...rest } = dto;
    return this.prisma.city.update({
      where: { id },
      data: { ...rest, provinceId, provinceCode },
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
