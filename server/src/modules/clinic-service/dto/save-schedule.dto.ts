import {
  IsArray,
  IsInt,
  IsBoolean,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ScheduleItemDto {
  @IsOptional()
  @IsInt()
  id?: number;

  @IsOptional()
  @IsInt()
  clinicServiceId?: number;

  @IsInt()
  dayOfWeek: number;

  @IsBoolean()
  hasMorning: boolean;

  @IsBoolean()
  hasAfternoon: boolean;

  @IsOptional()
  @IsBoolean()
  hasEvening?: boolean;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class SaveScheduleDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleItemDto)
  schedules: ScheduleItemDto[];
}
