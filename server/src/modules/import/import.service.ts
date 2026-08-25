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
  hospitalName: string;
  clinicName: string;
  schedule: string;
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
      doctorsCreated: 0,
      errors: [] as string[],
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowLabel = `第 ${i + 2} 行`;

      try {
        const city = await this.findOrCreateCity(row.city, province);
        if (!city) {
          result.errors.push(`${rowLabel}: 城市「${row.city}」无法匹配`);
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

        const schedules = this.parseScheduleText(row.schedule);
        if (schedules.length > 0) {
          await this.prisma.clinicSchedule.deleteMany({
            where: { clinicServiceId: clinicService.record.id },
          });
          await this.prisma.clinicSchedule.createMany({
            data: schedules.map((s) => ({
              clinicServiceId: clinicService.record.id,
              ...s,
            })),
          });
        }

        if (row.staff) {
          const names = this.splitStaffNames(row.staff);
          for (const name of names) {
            const existing = await this.prisma.doctor.findFirst({
              where: { hospitalId: hospital.record.id, name },
            });
            if (!existing) {
              await this.prisma.doctor.create({
                data: {
                  hospitalId: hospital.record.id,
                  name,
                  title: '护士',
                  isPublished: true,
                  sortOrder: 0,
                },
              });
              result.doctorsCreated++;
            }
          }
        }
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
      const hospitalName = String(raw[colMap.hospitalName] ?? '').trim();
      const clinicName = String(raw[colMap.clinicName] ?? '').trim();
      const schedule = String(raw[colMap.schedule] ?? '').trim();
      const staff = String(raw[colMap.staff] ?? '').trim();
      if (!city && !hospitalName) continue;
      rows.push({ city, hospitalName, clinicName, schedule, staff });
    }
    return rows;
  }

  private detectColumns(header: string[]) {
    const find = (keywords: string[]) => {
      const idx = header.findIndex((h) =>
        keywords.some((k) => h.includes(k)),
      );
      return idx >= 0 ? idx : 0;
    };
    return {
      city: find(['城市']),
      hospitalName: find(['医院']),
      clinicName: find(['门诊']),
      schedule: find(['出诊', '时间', '排班']),
      staff: find(['人员', '出诊', '医生', '护士']),
    };
  }

  private async findOrCreateCity(
    cityName: string,
    province: { id: number; code: string },
  ) {
    if (!cityName) return null;
    const normalized = cityName.replace(/市$/, '').trim();
    let city = await this.prisma.city.findFirst({
      where: {
        provinceId: province.id,
        name: { contains: normalized },
      },
    });
    if (!city) {
      city = await this.prisma.city.findFirst({
        where: { name: { contains: cityName } },
      });
    }
    if (!city) {
      const maxOrder = await this.prisma.city.aggregate({
        where: { provinceId: province.id },
        _max: { sortOrder: true },
      });
      city = await this.prisma.city.create({
        data: {
          name: normalized || cityName,
          code: `${province.code}${String(Date.now()).slice(-4)}`,
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
    const clinicType = this.matchClinicType(clinicName);
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

  private matchClinicType(clinicName: string): string {
    if (!clinicName) return 'stoma';
    const dict: { keywords: string[]; value: string }[] = [
      { keywords: ['泌尿', '尿控', '失禁'], value: 'stoma_urostomy' },
      { keywords: ['普外科'], value: 'stoma_wound_general' },
      { keywords: ['胃肠'], value: 'stoma_wound_gi' },
      { keywords: ['造口伤口', '伤口造口'], value: 'stoma_wound' },
      { keywords: ['伤口'], value: 'wound' },
      { keywords: ['护理'], value: 'nursing' },
      { keywords: ['造口'], value: 'stoma' },
    ];
    for (const d of dict) {
      if (d.keywords.some((k) => clinicName.includes(k))) return d.value;
    }
    return 'other';
  }

  private splitStaffNames(staff: string): string[] {
    return staff
      .split(/[、,，;；\s]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  private parseScheduleText(text: string): ParsedSchedule[] {
    if (!text) return [];

    const cleaned = text.replace(/\s+/g, '').trim();
    if (!cleaned) return [];

    const dayMap: Record<string, number> = {
      一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 7, 天: 7,
    };

    const expandRange = (start: number, end: number): number[] => {
      const result: number[] = [];
      const s = Math.min(start, end);
      const e = Math.max(start, end);
      for (let i = s; i <= e; i++) result.push(i);
      return result;
    };

    const parseDay = (token: string): number | null => {
      const m = token.match(/周(.)|星?期(.)|周天|周日/);
      if (m) {
        const ch = m[1] || m[2];
        if (ch && dayMap[ch]) return dayMap[ch];
      }
      return null;
    };

    const getTimeFlags = (token: string) => {
      const hasMorning = token.includes('上午') || token.includes('早');
      const hasAfternoon = token.includes('下午') || token.includes('午');
      const hasEvening = token.includes('晚间') || token.includes('晚上');
      const isFullDay = token.includes('全天');
      if (isFullDay) return { hasMorning: true, hasAfternoon: true, hasEvening: false };
      if (hasMorning && hasAfternoon) return { hasMorning: true, hasAfternoon: true, hasEvening: hasEvening };
      if (hasMorning) return { hasMorning: true, hasAfternoon: false, hasEvening: hasEvening };
      if (hasAfternoon) return { hasMorning: false, hasAfternoon: true, hasEvening: hasEvening };
      if (hasEvening) return { hasMorning: false, hasAfternoon: false, hasEvening: true };
      return null;
    };

    // Step 1: Expand ranges like 周一至周五 -> 周一、周二、周三、周四、周五
    let expanded = cleaned;
    const rangeRegex = /周(.)至周(.)|星?期(.)至星?期(.)/g;
    expanded = expanded.replace(rangeRegex, (match) => {
      const chars = match.match(/周(.)|星?期(.)/g);
      if (!chars || chars.length < 2) return match;
      const startCh = chars[0].match(/周(.)|星?期(.)/);
      const endCh = chars[1].match(/周(.)|星?期(.)/);
      const startDay = startCh ? dayMap[startCh[1] || startCh[2]] : null;
      const endDay = endCh ? dayMap[endCh[1] || endCh[2]] : null;
      if (startDay && endDay) {
        const days = expandRange(startDay, endDay);
        return days.map((d) => `周${Object.keys(dayMap).find((k) => dayMap[k] === d)}`).join('、');
      }
      return match;
    });

    // Step 2: Split by 、 ， , and group tokens with their time flags
    const tokens = expanded.split(/[、，,]+/).filter((t) => t);
    const scheduleMap = new Map<number, ParsedSchedule>();

    let pendingDays: number[] = [];
    const applyTimeFlags = (days: number[], flags: { hasMorning: boolean; hasAfternoon: boolean; hasEvening: boolean }) => {
      for (const d of days) {
        if (!scheduleMap.has(d)) {
          scheduleMap.set(d, { dayOfWeek: d, ...flags });
        } else {
          const existing = scheduleMap.get(d)!;
          existing.hasMorning = existing.hasMorning || flags.hasMorning;
          existing.hasAfternoon = existing.hasAfternoon || flags.hasAfternoon;
          existing.hasEvening = existing.hasEvening || flags.hasEvening;
        }
      }
    };

    for (const token of tokens) {
      const day = parseDay(token);
      const timeFlags = getTimeFlags(token);

      if (day !== null && timeFlags) {
        applyTimeFlags([...pendingDays, day], timeFlags);
        pendingDays = [];
      } else if (day !== null) {
        pendingDays.push(day);
      } else if (timeFlags) {
        applyTimeFlags(pendingDays, timeFlags);
        pendingDays = [];
      }
    }

    // Remaining pending days with no time flags -> default to full day
    for (const d of pendingDays) {
      if (!scheduleMap.has(d)) {
        scheduleMap.set(d, {
          dayOfWeek: d,
          hasMorning: true,
          hasAfternoon: true,
          hasEvening: false,
        });
      }
    }

    return Array.from(scheduleMap.values()).sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  }
}
