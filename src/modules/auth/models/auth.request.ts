import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class RegisterRequest {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}

export class LoginRequest {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
