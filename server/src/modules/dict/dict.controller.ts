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
} from '@nestjs/common';
import { DictService } from './dict.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('api/admin/dict')
@UseGuards(JwtAuthGuard)
export class DictController {
  constructor(private dictService: DictService) {}

  @Get('types')
  findAllTypes() {
    return this.dictService.findAllTypes();
  }

  @Post('types')
  @UseGuards(RolesGuard)
  @Roles('super_admin')
  createType(@Body() body: { code: string; name: string }) {
    return this.dictService.createType(body.code, body.name);
  }

  @Get('items')
  findItems(@Query('typeCode') typeCode: string) {
    return this.dictService.findItemsByTypeCode(typeCode);
  }

  @Post('items')
  @UseGuards(RolesGuard)
  @Roles('super_admin')
  createItem(@Body() body: { dictTypeId: number; label: string; value: string; sortOrder: number }) {
    return this.dictService.createItem(body.dictTypeId, body.label, body.value, body.sortOrder);
  }

  @Put('items/:id')
  @UseGuards(RolesGuard)
  @Roles('super_admin')
  updateItem(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.dictService.updateItem(id, body);
  }

  @Delete('items/:id')
  @UseGuards(RolesGuard)
  @Roles('super_admin')
  deleteItem(@Param('id', ParseIntPipe) id: number) {
    return this.dictService.deleteItem(id);
  }
}
