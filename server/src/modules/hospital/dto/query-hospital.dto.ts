import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryHospitalDto extends PaginationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  provinceCode?: string;

  @IsOptional()
  @IsString()
  cityCode?: string;

  @IsOptional()
  @IsString()
  level?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isPublished?: boolean;
}
