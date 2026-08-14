import { IsString, IsInt, IsBoolean, IsArray, MinLength, MaxLength, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  username: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @MaxLength(50)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsString()
  role: string; // super_admin | province_admin

  @IsArray()
  @IsInt({ each: true })
  provinceIds: number[];
}
