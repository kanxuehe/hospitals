import { IsString, IsInt, IsOptional, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePhoneDto {
  @IsString()
  @MaxLength(50)
  phoneType: string;

  @IsString()
  @MaxLength(50)
  phoneNumber: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  contactPerson?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;

  @IsInt()
  @Type(() => Number)
  sortOrder: number;
}
