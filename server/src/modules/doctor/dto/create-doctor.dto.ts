import { IsString, IsInt, IsBoolean, IsOptional, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDoctorDto {
  @IsInt()
  @Type(() => Number)
  hospitalId: number;

  @IsString()
  @MaxLength(50)
  name: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsString()
  @MaxLength(50)
  title: string;

  @IsOptional()
  @IsString()
  intro?: string;

  @IsOptional()
  @IsString()
  specialty?: string;

  @IsInt()
  @Type(() => Number)
  sortOrder: number;

  @IsBoolean()
  isPublished: boolean;
}
