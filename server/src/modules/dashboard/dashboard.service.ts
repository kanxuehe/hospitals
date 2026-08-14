import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats(dataScope: { provinceIds: number[] | null }) {
    const provinceFilter =
      dataScope.provinceIds !== null
        ? { provinceId: { in: dataScope.provinceIds } }
        : {};

    const hospitalWhere = {
      ...provinceFilter,
      deletedAt: null,
    };

    const [totalHospitals, publishedHospitals, totalDoctors, publishedDoctors, totalClinicServices, recentUpdatedHospitals] =
      await Promise.all([
        this.prisma.hospital.count({ where: hospitalWhere }),
        this.prisma.hospital.count({ where: { ...hospitalWhere, isPublished: true } }),
        this.prisma.doctor.count({
          where: {
            hospital: hospitalWhere,
          },
        }),
        this.prisma.doctor.count({
          where: {
            hospital: hospitalWhere,
            isPublished: true,
          },
        }),
        this.prisma.clinicService.count({
          where: {
            hospital: hospitalWhere,
          },
        }),
        this.prisma.hospital.count({
          where: {
            ...hospitalWhere,
            updatedAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
          },
        }),
      ]);

    return {
      hospitals: {
        total: totalHospitals,
        published: publishedHospitals,
        unpublished: totalHospitals - publishedHospitals,
      },
      doctors: {
        total: totalDoctors,
        published: publishedDoctors,
      },
      clinicServices: totalClinicServices,
      recentUpdates: recentUpdatedHospitals,
    };
  }
}
