import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateClinicServiceDto } from './dto/create-clinic-service.dto';
import { UpdateClinicServiceDto } from './dto/update-clinic-service.dto';
import { SaveScheduleDto } from './dto/save-schedule.dto';
import { CreatePhoneDto } from './dto/save-phone.dto';

@Injectable()
export class ClinicServiceService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateClinicServiceDto, dataScope: { provinceIds: number[] | null }) {
    await this.checkHospitalAccess(dto.hospitalId, dataScope);

    return this.prisma.clinicService.create({
      data: dto,
      include: {
        schedules: { orderBy: { dayOfWeek: 'asc' } },
        phones: { orderBy: { sortOrder: 'asc' } },
      },
    });
  }

  async update(id: number, dto: UpdateClinicServiceDto, dataScope: { provinceIds: number[] | null }) {
    const service = await this.ensureServiceExists(id);
    await this.checkHospitalAccess(service.hospitalId, dataScope);

    return this.prisma.clinicService.update({
      where: { id },
      data: dto,
      include: {
        schedules: { orderBy: { dayOfWeek: 'asc' } },
        phones: { orderBy: { sortOrder: 'asc' } },
      },
    });
  }

  async remove(id: number, dataScope: { provinceIds: number[] | null }) {
    const service = await this.ensureServiceExists(id);
    await this.checkHospitalAccess(service.hospitalId, dataScope);

    // 级联删除门诊时间和电话
    await this.prisma.clinicService.delete({ where: { id } });
    return { message: '删除成功' };
  }

  // === 门诊时间 ===
  async saveSchedule(clinicServiceId: number, dto: SaveScheduleDto, dataScope: { provinceIds: number[] | null }) {
    const service = await this.ensureServiceExists(clinicServiceId);
    await this.checkHospitalAccess(service.hospitalId, dataScope);

    // 删除旧数据，插入新数据
    await this.prisma.clinicSchedule.deleteMany({
      where: { clinicServiceId },
    });

    await this.prisma.clinicSchedule.createMany({
      data: dto.schedules.map((s) => ({
        clinicServiceId,
        dayOfWeek: s.dayOfWeek,
        hasMorning: s.hasMorning,
        hasAfternoon: s.hasAfternoon,
        hasEvening: s.hasEvening,
        remark: s.remark,
      })),
    });

    return this.prisma.clinicSchedule.findMany({
      where: { clinicServiceId },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  // === 联系电话 ===
  async createPhone(clinicServiceId: number, dto: CreatePhoneDto, dataScope: { provinceIds: number[] | null }) {
    const service = await this.ensureServiceExists(clinicServiceId);
    await this.checkHospitalAccess(service.hospitalId, dataScope);

    return this.prisma.phoneContact.create({
      data: { ...dto, clinicServiceId },
    });
  }

  async updatePhone(phoneId: number, dto: Partial<CreatePhoneDto>, dataScope: { provinceIds: number[] | null }) {
    const phone = await this.prisma.phoneContact.findUnique({
      where: { id: phoneId },
      include: { clinicService: true },
    });
    if (!phone) throw new NotFoundException('联系电话不存在');

    await this.checkHospitalAccess(phone.clinicService.hospitalId, dataScope);

    return this.prisma.phoneContact.update({
      where: { id: phoneId },
      data: dto,
    });
  }

  async deletePhone(phoneId: number, dataScope: { provinceIds: number[] | null }) {
    const phone = await this.prisma.phoneContact.findUnique({
      where: { id: phoneId },
      include: { clinicService: true },
    });
    if (!phone) throw new NotFoundException('联系电话不存在');

    await this.checkHospitalAccess(phone.clinicService.hospitalId, dataScope);

    await this.prisma.phoneContact.delete({ where: { id: phoneId } });
    return { message: '删除成功' };
  }

  private async ensureServiceExists(id: number) {
    const service = await this.prisma.clinicService.findUnique({ where: { id } });
    if (!service) throw new NotFoundException('门诊服务不存在');
    return service;
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
