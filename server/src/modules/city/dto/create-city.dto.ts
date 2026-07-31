import { IsString, IsInt, IsBoolean, Min, MaxLength, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCityDto {
  @IsInt()
  @Type(() => Number)
  provinceId: number;

  @IsString()
  @MaxLength(50)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  pinyin?: string;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  sortOrder: number;

  @IsBoolean()
  isEnabled: boolean;
}
