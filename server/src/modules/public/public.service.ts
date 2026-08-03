import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PublicService {
  constructor(private prisma: PrismaService) {}

  getProvinces() {
    return this.prisma.province.findMany({
      where: { isEnabled: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, code: true, name: true, shortName: true },
    });
  }

  async getCities(provinceCode: string) {
    const province = await this.prisma.province.findUnique({
      where: { code: provinceCode },
    });
    if (!province) return [];

    const cities = await this.prisma.city.findMany({
      where: { provinceId: province.id, isEnabled: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        _count: {
          select: {
            hospitals: {
              where: { isPublished: true, deletedAt: null },
            },
          },
        },
      },
    });

    return cities.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      count: c._count.hospitals,
    }));
  }

  async getHospitals(provinceCode: string, cityCode?: string) {
    const province = await this.prisma.province.findUnique({
      where: { code: provinceCode },
    });
    if (!province) return [];

    const where: any = {
      isPublished: true,
      deletedAt: null,
      provinceId: province.id,
    };

    if (cityCode) {
      const city = await this.prisma.city.findUnique({
        where: { code: cityCode },
      });
      if (city) where.cityId = city.id;
    }

    const hospitals = await this.prisma.hospital.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        level: true,
        address: true,
        intro: true,
        cityId: true,
        city: { select: { id: true, name: true } },
        clinicServices: {
          where: { isPublished: true },
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            clinicType: true,
            intro: true,
            schedules: {
              orderBy: { dayOfWeek: 'asc' },
              select: {
                dayOfWeek: true,
                hasMorning: true,
                hasAfternoon: true,
                hasEvening: true,
                remark: true,
              },
            },
            phones: {
              orderBy: { sortOrder: 'asc' },
              select: {
                id: true,
                phoneName: true,
                phoneNumber: true,
                contactPerson: true,
              },
            },
          },
        },
      },
    });

    return hospitals;
  }

  async getHospitalDetail(id: number) {
    const hospital = await this.prisma.hospital.findFirst({
      where: { id, isPublished: true, deletedAt: null },
      select: {
        id: true,
        name: true,
        level: true,
        address: true,
        intro: true,
        mapLng: true,
        mapLat: true,
        city: { select: { id: true, name: true } },
        province: { select: { id: true, name: true } },
        clinicServices: {
          where: { isPublished: true },
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            clinicType: true,
            intro: true,
            schedules: {
              orderBy: { dayOfWeek: 'asc' },
              select: {
                dayOfWeek: true,
                hasMorning: true,
                hasAfternoon: true,
                hasEvening: true,
                remark: true,
              },
            },
            phones: {
              orderBy: { sortOrder: 'asc' },
              select: {
                id: true,
                phoneName: true,
                phoneNumber: true,
                contactPerson: true,
              },
            },
          },
        },
        doctors: {
          where: { isPublished: true },
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            name: true,
            title: true,
            intro: true,
            specialty: true,
          },
        },
      },
    });

    return hospital;
  }
}
