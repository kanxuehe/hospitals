import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ProvinceService } from './province.service';
import { CreateProvinceDto } from './dto/create-province.dto';
import { UpdateProvinceDto } from './dto/update-province.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('api/admin/provinces')
@UseGuards(RolesGuard)
@Roles('super_admin')
export class ProvinceController {
  constructor(private provinceService: ProvinceService) {}

  @Get()
  findAll() {
    return this.provinceService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.provinceService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateProvinceDto) {
    return this.provinceService.create(dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProvinceDto,
  ) {
    return this.provinceService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.provinceService.remove(id);
  }
}
