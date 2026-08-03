import { Controller, Get, Param, ParseIntPipe, Query, NotFoundException } from '@nestjs/common';
import { PublicService } from './public.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('api/public')
@Public()
export class PublicController {
  constructor(private publicService: PublicService) {}

  @Get('provinces')
  getProvinces() {
    return this.publicService.getProvinces();
  }

  @Get('cities')
  getCities(@Query('provinceCode') provinceCode: string) {
    return this.publicService.getCities(provinceCode);
  }

  @Get('hospitals')
  getHospitals(
    @Query('provinceCode') provinceCode: string,
    @Query('cityCode') cityCode?: string,
  ) {
    return this.publicService.getHospitals(provinceCode, cityCode);
  }

  @Get('hospitals/:id')
  async getHospitalDetail(@Param('id', ParseIntPipe) id: number) {
    const hospital = await this.publicService.getHospitalDetail(id);
    if (!hospital) throw new NotFoundException('医院不存在');
    return hospital;
  }
}
