import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProvinceModule } from './modules/province/province.module';
import { CityModule } from './modules/city/city.module';
import { DictModule } from './modules/dict/dict.module';
import { HospitalModule } from './modules/hospital/hospital.module';
import { ClinicServiceModule } from './modules/clinic-service/clinic-service.module';
import { DoctorModule } from './modules/doctor/doctor.module';
import { UserModule } from './modules/user/user.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { PublicModule } from './modules/public/public.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ProvinceModule,
    CityModule,
    DictModule,
    HospitalModule,
    ClinicServiceModule,
    DoctorModule,
    UserModule,
    DashboardModule,
    PublicModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
