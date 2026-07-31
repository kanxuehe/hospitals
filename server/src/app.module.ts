import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProvinceModule } from './modules/province/province.module';

@Module({
  imports: [PrismaModule, AuthModule, ProvinceModule],
})
export class AppModule {}
