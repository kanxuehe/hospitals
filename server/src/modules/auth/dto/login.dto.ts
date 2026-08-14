import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  username: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  rememberMe?: string;
}
