import { IsString, IsInt, IsBoolean, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProvinceDto {
  @IsString()
  @MaxLength(50)
  name: string;

  @IsString()
  @MaxLength(10)
  shortName: string;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  sortOrder: number;

  @IsBoolean()
  isEnabled: boolean;
}
