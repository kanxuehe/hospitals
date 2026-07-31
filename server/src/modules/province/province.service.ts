import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProvinceDto } from './dto/create-province.dto';
import { UpdateProvinceDto } from './dto/update-province.dto';

@Injectable()
export class ProvinceService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.province.findMany({
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

  findOne(id: number) {
    return this.prisma.province.findUnique({
      where: { id },
      include: {
        cities: { orderBy: { sortOrder: 'asc' } },
      },
    });
  }

  async create(dto: CreateProvinceDto) {
    const existing = await this.prisma.province.findFirst({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException('省份名称已存在');
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
