import { Module } from '@nestjs/common';
import { ClinicServiceController } from './clinic-service.controller';
import { ClinicServiceService } from './clinic-service.service';

@Module({
  controllers: [ClinicServiceController],
  providers: [ClinicServiceService],
  exports: [ClinicServiceService],
})
export class ClinicServiceModule {}
