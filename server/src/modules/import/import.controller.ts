import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Query,
  Req,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { extname } from 'path';
import { ImportService } from './import.service';
import { DataScopeGuard } from '../../common/guards/data-scope.guard';

@Controller('api/admin/import')
@UseGuards(DataScopeGuard)
export class ImportController {
  constructor(private importService: ImportService) {}

  @Post('hospitals')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase();
        if (['.xlsx', '.xls'].includes(ext)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('仅支持 .xlsx 或 .xls 格式文件') as any, false);
        }
      },
    }),
  )
  async importHospitals(
    @UploadedFile() file: Express.Multer.File,
    @Query('provinceId') provinceId: string,
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException('请上传 Excel 文件');
    const provinceIdNum = parseInt(provinceId, 10);
    if (!provinceIdNum) throw new BadRequestException('请选择省份');

    return this.importService.importHospitals(
      file,
      provinceIdNum,
      req.user.sub,
    );
  }
}
