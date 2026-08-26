import { Injectable, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { PrismaService } from '../../prisma/prisma.service';

interface ParsedSchedule {
  dayOfWeek: number;
  hasMorning: boolean;
  hasAfternoon: boolean;
  hasEvening: boolean;
}

interface ExcelRow {
  city: string;
  cityCode: string;
  hospitalName: string;
  clinicName: string;
  schedule: ParsedSchedule[];
  staff: string;
}

@Injectable()
export class ImportService {
  constructor(private prisma: PrismaService) {}

  async importHospitals(
    file: Express.Multer.File,
    provinceId: number,
    userId: number,
  ) {
    const province = await this.prisma.province.findUnique({
      where: { id: provinceId },
    });
    if (!province) throw new BadRequestException('省份不存在');

    const rows = this.parseExcel(file.buffer);
    if (rows.length === 0) {
      throw new BadRequestException('Excel 文件中没有有效数据行');
    }

    const result = {
      total: rows.length,
      hospitalsCreated: 0,
      hospitalsSkipped: 0,
      clinicServicesCreated: 0,
      staffContactsCreated: 0,
      errors: [] as string[],
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowLabel = `第 ${i + 2} 行`;

      try {
        const city = await this.findOrCreateCity(
          row.city,
          row.cityCode,
          province,
        );
        if (!city) {
          result.errors.push(
            `${rowLabel}: 城市「${row.city}」无法匹配（缺少行政区划代码）`,
          );
          continue;
        }

        const hospital = await this.findOrCreateHospital(
          row.hospitalName,
          city.id,
          provinceId,
          userId,
        );
        if (hospital.created) result.hospitalsCreated++;
        else result.hospitalsSkipped++;

        const clinicService = await this.findOrCreateClinicService(
          hospital.record.id,
          row.clinicName,
        );
        if (clinicService.created) result.clinicServicesCreated++;

        if (row.schedule.length > 0) {
          await this.prisma.clinicSchedule.deleteMany({
            where: { clinicServiceId: clinicService.record.id },
          });
          await this.prisma.clinicSchedule.createMany({
            data: row.schedule.map((s) => ({
              clinicServiceId: clinicService.record.id,
              ...s,
            })),
          });
        }

        // Excel「出诊人员」映射到门诊服务下的联系电话（PhoneContact.contactPerson）
        if (row.staff) {
          const names = this.splitStaffNames(row.staff);
          for (const name of names) {
            // 同一门诊服务下已有同名出诊人员则跳过
            const existing = await this.prisma.phoneContact.findFirst({
              where: {
                clinicServiceId: clinicService.record.id,
                contactPerson: name,
              },
            });
            if (existing) continue;

            const maxOrder = await this.prisma.phoneContact.aggregate({
              where: { clinicServiceId: clinicService.record.id },
              _max: { sortOrder: true },
            });
            await this.prisma.phoneContact.create({
              data: {
                clinicServiceId: clinicService.record.id,
                phoneType: 'consultation',
                phoneNumber: '',
                contactPerson: name,
                sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
              },
            });
            result.staffContactsCreated++;
          }
        }
        // Excel「出诊人员」映射结束
      } catch (e) {
        result.errors.push(`${rowLabel}: ${(e as Error).message}`);
      }
    }

    return result;
  }

  private parseExcel(buffer: Buffer): ExcelRow[] {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) throw new BadRequestException('Excel 文件中没有工作表');

    const data: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
    });
    if (data.length < 2) return [];

    const header = data[0].map((h) => String(h).trim());
    const colMap = this.detectColumns(header);

    const rows: ExcelRow[] = [];
    for (let i = 1; i < data.length; i++) {
      const raw = data[i];
      if (!raw) continue;
      const city = String(raw[colMap.city] ?? '').trim();
      const cityCode =
        colMap.cityCode >= 0 ? String(raw[colMap.cityCode] ?? '').trim() : '';
      const hospitalName = String(raw[colMap.hospitalName] ?? '').trim();
      const clinicName = String(raw[colMap.clinicName] ?? '').trim();
      const schedule = this.parseScheduleGrid(raw, colMap.scheduleCols);
      const staff = String(raw[colMap.staff] ?? '').trim();
      if (!city && !hospitalName) continue;
      rows.push({ city, cityCode, hospitalName, clinicName, schedule, staff });
    }
    return rows;
  }

  private detectColumns(header: string[]) {
    const find = (keywords: string[], exclude: number[] = []) => {
      const idx = header.findIndex(
        (h, i) => !exclude.includes(i) && keywords.some((k) => h.includes(k)),
      );
      return idx >= 0 ? idx : 0;
    };
    const findOptional = (keywords: string[], exclude: number[] = []) => {
      const idx = header.findIndex(
        (h, i) => !exclude.includes(i) && keywords.some((k) => h.includes(k)),
      );
      return idx;
    };
    const cityCodeIdx = findOptional(['代码', 'code', '区划']);
    const exclude = cityCodeIdx >= 0 ? [cityCodeIdx] : [];
    const dayChs: Record<string, number> = {
      一: 1,
      二: 2,
      三: 3,
      四: 4,
      五: 5,
      六: 6,
      日: 7,
      天: 7,
    };
    const periodKeys = [
      { period: 'morning' as const, keywords: ['上午', '早'] },
      { period: 'afternoon' as const, keywords: ['下午'] },
      { period: 'evening' as const, keywords: ['晚上', '晚间', '夜间'] },
    ];
    // 识别 21 个出诊时段列：周一上午 ~ 周日晚上
    const scheduleCols: {
      colIndex: number;
      day: number;
      period: 'morning' | 'afternoon' | 'evening';
    }[] = [];
    header.forEach((h, i) => {
      const dayMatch = h.match(/周(.)|星期(.)|周天|周日/);
      let day = 0;
      if (dayMatch) {
        const ch = dayMatch[1] || dayMatch[2];
        if (ch && dayChs[ch]) day = dayChs[ch];
      }
      if (!day) return;
      const period = periodKeys.find((p) =>
        p.keywords.some((k) => h.includes(k)),
      )?.period;
      if (period) scheduleCols.push({ colIndex: i, day, period });
    });
    return {
      city: find(['城市'], exclude),
      cityCode: cityCodeIdx,
      hospitalName: find(['医院'], exclude),
      clinicName: find(['门诊'], exclude),
      scheduleCols,
      staff: find(['人员', '医生', '护士'], exclude),
    };
  }

  /**
   * 从 21 列勾选单元格解析出诊时间。
   * 单元格值含 1/✓/√/Y/y/是 视为出诊；空或其它值视为不出诊。
   * 仅返回至少有一个时段为 true 的天。
   */
  private parseScheduleGrid(
    raw: unknown[],
    scheduleCols: {
      colIndex: number;
      day: number;
      period: 'morning' | 'afternoon' | 'evening';
    }[],
  ): ParsedSchedule[] {
    const truthy = new Set(['1', '✓', '√', 'y', 'Y', '是', 'yes', 'true']);
    const map = new Map<number, ParsedSchedule>();
    for (const col of scheduleCols) {
      const val = String(raw[col.colIndex] ?? '').trim();
      const checked = truthy.has(val);
      if (!checked) continue;
      let day = map.get(col.day);
      if (!day) {
        day = {
          dayOfWeek: col.day,
          hasMorning: false,
          hasAfternoon: false,
          hasEvening: false,
        };
        map.set(col.day, day);
      }
      if (col.period === 'morning') day.hasMorning = true;
      else if (col.period === 'afternoon') day.hasAfternoon = true;
      else day.hasEvening = true;
    }
    return Array.from(map.values()).sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  }

  private async findOrCreateCity(
    cityName: string,
    cityCode: string,
    province: { id: number; code: string },
  ) {
    const normalized = cityName.replace(/市$/, '').trim();
    // 优先用 Excel 提供的行政区划代码匹配
    let city = null as null | { id: number; code: string };
    if (cityCode) {
      city = await this.prisma.city.findUnique({ where: { code: cityCode } });
    }
    if (!city && cityName) {
      city = await this.prisma.city.findFirst({
        where: {
          provinceId: province.id,
          name: { contains: normalized },
        },
      });
    }
    if (!city && cityName) {
      city = await this.prisma.city.findFirst({
        where: { name: { contains: cityName } },
      });
    }
    // 不存在时，必须用 Excel 提供的 cityCode 创建，不再自动生成代码
    if (!city) {
      if (!cityCode) return null;
      const maxOrder = await this.prisma.city.aggregate({
        where: { provinceId: province.id },
        _max: { sortOrder: true },
      });
      city = await this.prisma.city.create({
        data: {
          name: normalized || cityName,
          code: cityCode,
          provinceId: province.id,
          provinceCode: province.code,
          sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
          isEnabled: true,
        },
      });
    }
    return city;
  }

  private async findOrCreateHospital(
    name: string,
    cityId: number,
    provinceId: number,
    userId: number,
  ) {
    let record = await this.prisma.hospital.findFirst({
      where: { name, cityId, deletedAt: null },
    });
    if (record) return { record, created: false };

    const maxOrder = await this.prisma.hospital.aggregate({
      where: { provinceId },
      _max: { sortOrder: true },
    });
    record = await this.prisma.hospital.create({
      data: {
        name,
        cityId,
        provinceId,
        level: 'other',
        isPublished: false,
        sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
        createdBy: userId,
      },
    });
    return { record, created: true };
  }

  private async findOrCreateClinicService(
    hospitalId: number,
    clinicName: string,
  ) {
    const clinicType = await this.resolveClinicType(clinicName);
    let record = await this.prisma.clinicService.findFirst({
      where: { hospitalId, clinicType },
    });
    if (record) return { record, created: false };

    const maxOrder = await this.prisma.clinicService.aggregate({
      where: { hospitalId },
      _max: { sortOrder: true },
    });
    record = await this.prisma.clinicService.create({
      data: {
        hospitalId,
        clinicType,
        intro: clinicName,
        sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
        isPublished: true,
      },
    });
    return { record, created: true };
  }

  /**
   * 按门诊名称解析 clinicType：
   * - 在字典表 clinic_type 中按 label 精确匹配，命中则返回其 value
   * - 未命中则新建字典项（label 与 value 均使用门诊名称汉字）
   * - 门诊名称为空时返回"其他"
   */
  private async resolveClinicType(clinicName: string): Promise<string> {
    if (!clinicName) return '其他';
    const dictType = await this.prisma.dictType.findUnique({
      where: { code: 'clinic_type' },
    });
    if (!dictType) return clinicName;

    const existing = await this.prisma.dictItem.findFirst({
      where: { dictTypeId: dictType.id, label: clinicName },
    });
    if (existing) return existing.value;

    const maxOrder = await this.prisma.dictItem.aggregate({
      where: { dictTypeId: dictType.id },
      _max: { sortOrder: true },
    });
    const created = await this.prisma.dictItem.create({
      data: {
        dictTypeId: dictType.id,
        label: clinicName,
        value: clinicName,
        sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
        isEnabled: true,
      },
    });
    return created.value;
  }

  private splitStaffNames(staff: string): string[] {
    return staff
      .split(/[、,，;；\s]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
}
