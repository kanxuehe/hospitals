import { IsOptional, IsString, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryDoctorDto extends PaginationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  hospitalId?: number;

  @IsOptional()
  @IsString()
  title?: string;
}
