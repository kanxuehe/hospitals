import {
  IsString,
  IsInt,
  IsBoolean,
  IsOptional,
  IsNumber,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateHospitalDto {
  @IsInt()
  @Type(() => Number)
  provinceId: number;

  @IsInt()
  @Type(() => Number)
  cityId: number;

  @IsString()
  @MaxLength(200)
  name: string;

  @IsString()
  @MaxLength(50)
  level: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsNumber()
  mapLng?: number;

  @IsOptional()
  @IsNumber()
  mapLat?: number;

  @IsOptional()
  @IsString()
  intro?: string;

  @IsBoolean()
  isPublished: boolean;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  sortOrder: number;
}
