import { IsArray, IsInt, IsBoolean, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ScheduleItemDto {
  @IsInt()
  dayOfWeek: number;

  @IsBoolean()
  hasMorning: boolean;

  @IsBoolean()
  hasAfternoon: boolean;

  @IsBoolean()
  hasEvening: boolean;

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
