import { IsString, IsInt, IsBoolean, IsOptional, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateClinicServiceDto {
  @IsInt()
  @Type(() => Number)
  hospitalId: number;

  @IsString()
  @MaxLength(50)
  clinicType: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  intro?: string;

  @IsInt()
  @Type(() => Number)
  sortOrder: number;

  @IsBoolean()
  isPublished: boolean;
}
