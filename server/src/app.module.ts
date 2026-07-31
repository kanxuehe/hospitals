import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProvinceModule } from './modules/province/province.module';
import { CityModule } from './modules/city/city.module';

@Module({
  imports: [PrismaModule, AuthModule, ProvinceModule, CityModule],
})
export class AppModule {}
