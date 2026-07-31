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
import { DoctorService } from './doctor.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { QueryDoctorDto } from './dto/query-doctor.dto';
import { DataScopeGuard } from '../../common/guards/data-scope.guard';

@Controller('api/admin/doctors')
@UseGuards(DataScopeGuard)
export class DoctorController {
  constructor(private doctorService: DoctorService) {}

  @Get()
  findAll(@Query() query: QueryDoctorDto, @Req() req: any) {
    return this.doctorService.findMany(query, req.dataScope);
  }

  @Post()
  create(@Body() dto: CreateDoctorDto, @Req() req: any) {
    return this.doctorService.create(dto, req.dataScope);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDoctorDto,
    @Req() req: any,
  ) {
    return this.doctorService.update(id, dto, req.dataScope);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.doctorService.remove(id, req.dataScope);
  }
}
