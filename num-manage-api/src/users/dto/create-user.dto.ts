import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  nom!: string;

  @IsNotEmpty()
  @IsString()
  prenom!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  telephone!: string;

  @IsString()
@IsNotEmpty()
password!: string;
}