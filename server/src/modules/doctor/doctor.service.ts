import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { QueryDoctorDto } from './dto/query-doctor.dto';

@Injectable()
export class DoctorService {
  constructor(private prisma: PrismaService) {}

  async findMany(query: QueryDoctorDto, dataScope: { provinceIds: number[] | null }) {
    const { page = 1, pageSize = 10, name, hospitalId, title } = query;

    const where: Prisma.DoctorWhereInput = {};

    if (name) where.name = { contains: name };
    if (hospitalId) where.hospitalId = hospitalId;
    if (title) where.title = title;

    if (dataScope.provinceIds !== null) {
      where.hospital = {
        provinceId: { in: dataScope.provinceIds },
        deletedAt: null,
      };
    } else {
      where.hospital = { deletedAt: null };
    }

    const [total, list] = await Promise.all([
      this.prisma.doctor.count({ where }),
      this.prisma.doctor.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
        include: {
          hospital: {
            select: { id: true, name: true, provinceId: true },
          },
        },
      }),
    ]);

    return { list, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async create(dto: CreateDoctorDto, dataScope: { provinceIds: number[] | null }) {
    await this.checkHospitalAccess(dto.hospitalId, dataScope);
    return this.prisma.doctor.create({ data: dto });
  }

  async update(id: number, dto: UpdateDoctorDto, dataScope: { provinceIds: number[] | null }) {
    const doctor = await this.ensureExists(id);
    await this.checkHospitalAccess(doctor.hospitalId, dataScope);

    if (dto.hospitalId !== undefined) {
      await this.checkHospitalAccess(dto.hospitalId, dataScope);
    }

    return this.prisma.doctor.update({ where: { id }, data: dto });
  }

  async remove(id: number, dataScope: { provinceIds: number[] | null }) {
    const doctor = await this.ensureExists(id);
    await this.checkHospitalAccess(doctor.hospitalId, dataScope);

    await this.prisma.doctor.delete({ where: { id } });
    return { message: '删除成功' };
  }

  private async ensureExists(id: number) {
    const doctor = await this.prisma.doctor.findUnique({ where: { id } });
    if (!doctor) throw new NotFoundException('医生不存在');
    return doctor;
  }

  private async checkHospitalAccess(hospitalId: number, dataScope: { provinceIds: number[] | null }) {
    const hospital = await this.prisma.hospital.findFirst({
      where: { id: hospitalId, deletedAt: null },
      select: { provinceId: true },
    });
    if (!hospital) throw new NotFoundException('医院不存在');
    if (dataScope.provinceIds !== null && !dataScope.provinceIds.includes(hospital.provinceId)) {
      throw new ForbiddenException('您无权操作该医院的数据');
    }
  }
}
