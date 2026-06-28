import { IsEmail, IsString, IsNotEmpty, MinLength, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../common/enums/role.enum';

export class CreateUserDto {
  @ApiProperty({ example: 'Jean' })
  @IsNotEmpty()
  @IsString()
  firstname: string;

  @ApiProperty({ example: 'Dupont' })
  @IsNotEmpty()
  @IsString()
  lastname: string;

  @ApiProperty({ example: 'jean.dupont@example.com' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password123!' })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ enum: Role, default: Role.APPRENANT })
  @IsOptional()
  @IsEnum(Role)
  role?: Role = Role.APPRENANT;

  @ApiProperty({ example: '+33612345678', required: false })
  @IsOptional()
  @IsString()
  phoneNumber?: string;
}