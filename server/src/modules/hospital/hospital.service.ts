import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateHospitalDto } from './dto/create-hospital.dto';
import { UpdateHospitalDto } from './dto/update-hospital.dto';
import { QueryHospitalDto } from './dto/query-hospital.dto';

@Injectable()
export class HospitalService {
  constructor(private prisma: PrismaService) {}

  async findMany(query: QueryHospitalDto, dataScope: { provinceIds: number[] | null }) {
    const { page = 1, pageSize = 10, name, provinceCode, cityCode, level, isPublished } = query;

    const where: Prisma.HospitalWhereInput = {
      deletedAt: null,
    };

    if (dataScope.provinceIds !== null) {
      where.provinceId = { in: dataScope.provinceIds };
    }

    if (provinceCode) {
      const province = await this.prisma.province.findUnique({
        where: { code: provinceCode },
      });
      if (province) where.provinceId = province.id;
    }

    if (cityCode) {
      const city = await this.prisma.city.findUnique({
        where: { code: cityCode },
      });
      if (city) where.cityId = city.id;
    }

    if (level) where.level = level;
    if (isPublished !== undefined) where.isPublished = isPublished;
    if (name) where.name = { contains: name };

    const [total, list] = await Promise.all([
      this.prisma.hospital.count({ where }),
      this.prisma.hospital.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [
          { province: { sortOrder: 'asc' } },
          { sortOrder: 'asc' },
          { updatedAt: 'desc' },
        ],
        include: {
          province: { select: { id: true, name: true } },
          city: { select: { id: true, name: true } },
          _count: {
            select: {
              clinicServices: true,
              doctors: true,
            },
          },
        },
      }),
    ]);

    return {
      list,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: number, dataScope: { provinceIds: number[] | null }) {
    const hospital = await this.prisma.hospital.findFirst({
      where: { id, deletedAt: null },
      include: {
        province: true,
        city: true,
        clinicServices: {
          orderBy: { sortOrder: 'asc' },
          include: {
            schedules: { orderBy: { dayOfWeek: 'asc' } },
            phones: { orderBy: { sortOrder: 'asc' } },
          },
        },
        doctors: { orderBy: { sortOrder: 'asc' } },
        images: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!hospital) throw new NotFoundException('医院不存在');

    this.checkProvinceAccess(hospital.provinceId, dataScope);

    return hospital;
  }

  async create(dto: CreateHospitalDto, userId: number, dataScope: { provinceIds: number[] | null }) {
    this.checkProvinceAccess(dto.provinceId, dataScope);

    return this.prisma.hospital.create({
      data: {
        ...dto,
        createdBy: userId,
      },
    });
  }

  async update(id: number, dto: UpdateHospitalDto, dataScope: { provinceIds: number[] | null }) {
    const hospital = await this.ensureExists(id);
    this.checkProvinceAccess(hospital.provinceId, dataScope);

    // 如果要修改省份，检查新省份是否在权限范围内
    if (dto.provinceId !== undefined) {
      this.checkProvinceAccess(dto.provinceId, dataScope);
    }

    return this.prisma.hospital.update({
      where: { id },
      data: dto,
    });
  }

  async softDelete(id: number, dataScope: { provinceIds: number[] | null }) {
    const hospital = await this.ensureExists(id);
    this.checkProvinceAccess(hospital.provinceId, dataScope);

    await this.prisma.hospital.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { message: '删除成功' };
  }

  async batchPublish(ids: number[], isPublished: boolean, dataScope: { provinceIds: number[] | null }) {
    const where: Prisma.HospitalWhereInput = {
      id: { in: ids },
      deletedAt: null,
    };

    if (dataScope.provinceIds !== null) {
      where.provinceId = { in: dataScope.provinceIds };
    }

    const result = await this.prisma.hospital.updateMany({
      where,
      data: { isPublished },
    });

    return { updated: result.count };
  }

  async batchDelete(ids: number[], dataScope: { provinceIds: number[] | null }) {
    const where: Prisma.HospitalWhereInput = {
      id: { in: ids },
      deletedAt: null,
    };

    if (dataScope.provinceIds !== null) {
      where.provinceId = { in: dataScope.provinceIds };
    }

    const result = await this.prisma.hospital.updateMany({
      where,
      data: { deletedAt: new Date() },
    });

    return { deleted: result.count };
  }

  private async ensureExists(id: number) {
    const hospital = await this.prisma.hospital.findFirst({
      where: { id, deletedAt: null },
    });
    if (!hospital) throw new NotFoundException('医院不存在');
    return hospital;
  }

  private checkProvinceAccess(provinceId: number, dataScope: { provinceIds: number[] | null }) {
    if (dataScope.provinceIds !== null && !dataScope.provinceIds.includes(provinceId)) {
      throw new ForbiddenException('您无权操作该省份的数据');
    }
  }
}
