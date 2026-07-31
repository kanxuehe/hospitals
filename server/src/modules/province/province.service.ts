import { Injectable, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProvinceDto } from './dto/create-province.dto';
import { UpdateProvinceDto } from './dto/update-province.dto';

interface DataScope {
  provinceIds: number[] | null;
}

@Injectable()
export class ProvinceService {
  constructor(private prisma: PrismaService) {}

  findAll(dataScope?: DataScope) {
    const where: any = {};
    if (dataScope?.provinceIds) {
      where.id = { in: dataScope.provinceIds };
    }

    return this.prisma.province.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: {
            cities: true,
            hospitals: { where: { deletedAt: null } },
          },
        },
      },
    });
  }

  async findOne(id: number, dataScope?: DataScope) {
    const province = await this.prisma.province.findUnique({
      where: { id },
      include: {
        cities: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!province) {
      throw new NotFoundException('省份不存在');
    }

    if (dataScope?.provinceIds && !dataScope.provinceIds.includes(id)) {
      throw new ForbiddenException('您无权查看该省份');
    }

    return province;
  }

  async create(dto: CreateProvinceDto) {
    const existingName = await this.prisma.province.findFirst({
      where: { name: dto.name },
    });
    if (existingName) {
      throw new ConflictException('省份名称已存在');
    }

    const existingCode = await this.prisma.province.findUnique({
      where: { code: dto.code },
    });
    if (existingCode) {
      throw new ConflictException('省份编码已存在');
    }

    return this.prisma.province.create({ data: dto });
  }

  async update(id: number, dto: UpdateProvinceDto) {
    await this.ensureExists(id);
    return this.prisma.province.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: number) {
    await this.ensureExists(id);

    const hospitalCount = await this.prisma.hospital.count({
      where: { provinceId: id, deletedAt: null },
    });
    if (hospitalCount > 0) {
      throw new ConflictException('该省份下还有医院，无法删除');
    }

    await this.prisma.province.delete({ where: { id } });
    return { message: '删除成功' };
  }

  private async ensureExists(id: number) {
    const province = await this.prisma.province.findUnique({ where: { id } });
    if (!province) {
      throw new NotFoundException('省份不存在');
    }
    return province;
  }
}
