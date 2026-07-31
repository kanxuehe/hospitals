import {
  Body,
  Controller,
  Delete,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ClinicServiceService } from './clinic-service.service';
import { CreateClinicServiceDto } from './dto/create-clinic-service.dto';
import { UpdateClinicServiceDto } from './dto/update-clinic-service.dto';
import { SaveScheduleDto } from './dto/save-schedule.dto';
import { CreatePhoneDto } from './dto/save-phone.dto';
import { DataScopeGuard } from '../../common/guards/data-scope.guard';

@Controller('api/admin/clinic-services')
@UseGuards(DataScopeGuard)
export class ClinicServiceController {
  constructor(private clinicServiceService: ClinicServiceService) {}

  @Post()
  create(@Body() dto: CreateClinicServiceDto, @Req() req: any) {
    return this.clinicServiceService.create(dto, req.dataScope);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClinicServiceDto,
    @Req() req: any,
  ) {
    return this.clinicServiceService.update(id, dto, req.dataScope);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.clinicServiceService.remove(id, req.dataScope);
  }

  // 门诊时间
  @Put(':id/schedules')
  saveSchedule(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SaveScheduleDto,
    @Req() req: any,
  ) {
    return this.clinicServiceService.saveSchedule(id, dto, req.dataScope);
  }

  // 联系电话
  @Post(':id/phones')
  createPhone(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreatePhoneDto,
    @Req() req: any,
  ) {
    return this.clinicServiceService.createPhone(id, dto, req.dataScope);
  }

  @Put('phones/:phoneId')
  updatePhone(
    @Param('phoneId', ParseIntPipe) phoneId: number,
    @Body() dto: Partial<CreatePhoneDto>,
    @Req() req: any,
  ) {
    return this.clinicServiceService.updatePhone(phoneId, dto, req.dataScope);
  }

  @Delete('phones/:phoneId')
  deletePhone(@Param('phoneId', ParseIntPipe) phoneId: number, @Req() req: any) {
    return this.clinicServiceService.deletePhone(phoneId, req.dataScope);
  }
}
