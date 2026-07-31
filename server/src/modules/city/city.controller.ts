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
import { CityService } from './city.service';
import { CreateCityDto } from './dto/create-city.dto';
import { UpdateCityDto } from './dto/update-city.dto';
import { DataScopeGuard } from '../../common/guards/data-scope.guard';

@Controller('api/admin/cities')
@UseGuards(DataScopeGuard)
export class CityController {
  constructor(private cityService: CityService) {}

  @Get()
  findAll(@Query('provinceId') provinceId?: string) {
    return this.cityService.findAll(provinceId ? parseInt(provinceId) : undefined);
  }

  @Post()
  create(@Body() dto: CreateCityDto, @Req() req: any) {
    return this.cityService.create(dto, req.dataScope);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCityDto,
    @Req() req: any,
  ) {
    return this.cityService.update(id, dto, req.dataScope);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.cityService.remove(id, req.dataScope);
  }
}
