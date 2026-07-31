import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProvinceModule } from './modules/province/province.module';
import { CityModule } from './modules/city/city.module';
import { DictModule } from './modules/dict/dict.module';
import { HospitalModule } from './modules/hospital/hospital.module';

@Module({
  imports: [PrismaModule, AuthModule, ProvinceModule, CityModule, DictModule, HospitalModule],
})
export class AppModule {}
