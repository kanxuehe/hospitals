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
  Req,
} from '@nestjs/common';
import { ProvinceService } from './province.service';
import { CreateProvinceDto } from './dto/create-province.dto';
import { UpdateProvinceDto } from './dto/update-province.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { DataScopeGuard } from '../../common/guards/data-scope.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('api/admin/provinces')
@UseGuards(DataScopeGuard, RolesGuard)
export class ProvinceController {
  constructor(private provinceService: ProvinceService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.provinceService.findAll(req.dataScope);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.provinceService.findOne(id, req.dataScope);
  }

  @Post()
  @Roles('super_admin')
  create(@Body() dto: CreateProvinceDto) {
    return this.provinceService.create(dto);
  }

  @Put(':id')
  @Roles('super_admin')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProvinceDto,
  ) {
    return this.provinceService.update(id, dto);
  }

  @Delete(':id')
  @Roles('super_admin')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.provinceService.remove(id);
  }
}
