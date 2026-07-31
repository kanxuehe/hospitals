import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { HospitalService } from './hospital.service';
import { CreateHospitalDto } from './dto/create-hospital.dto';
import { UpdateHospitalDto } from './dto/update-hospital.dto';
import { QueryHospitalDto } from './dto/query-hospital.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DataScopeGuard } from '../../common/guards/data-scope.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('api/admin/hospitals')
@UseGuards(JwtAuthGuard, DataScopeGuard)
export class HospitalController {
  constructor(private hospitalService: HospitalService) {}

  @Get()
  findAll(@Query() query: QueryHospitalDto, @Req() req: any) {
    return this.hospitalService.findMany(query, req.dataScope);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.hospitalService.findOne(id, req.dataScope);
  }

  @Post()
  create(
    @Body() dto: CreateHospitalDto,
    @CurrentUser('sub') userId: number,
    @Req() req: any,
  ) {
    return this.hospitalService.create(dto, userId, req.dataScope);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateHospitalDto,
    @Req() req: any,
  ) {
    return this.hospitalService.update(id, dto, req.dataScope);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.hospitalService.softDelete(id, req.dataScope);
  }

  @Post('batch/publish')
  batchPublish(
    @Body() body: { ids: number[]; isPublished: boolean },
    @Req() req: any,
  ) {
    return this.hospitalService.batchPublish(body.ids, body.isPublished, req.dataScope);
  }

  @Post('batch/delete')
  batchDelete(@Body() body: { ids: number[] }, @Req() req: any) {
    return this.hospitalService.batchDelete(body.ids, req.dataScope);
  }
}
