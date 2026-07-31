import { IsString, IsInt, IsBoolean, Min, MaxLength, IsOptional, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCityDto {
  @IsInt()
  @Type(() => Number)
  provinceId: number;

  @IsString()
  @Matches(/^[0-9]{6}$/, { message: '城市编码必须为6位数字' })
  code: string;

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
