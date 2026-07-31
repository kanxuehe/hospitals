import { IsOptional, IsString, IsInt, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryHospitalDto extends PaginationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  provinceId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  cityId?: number;

  @IsOptional()
  @IsString()
  level?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
