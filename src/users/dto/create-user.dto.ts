import {
  IsEmail,
  IsString,
  IsNotEmpty,
  MinLength,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../common/enums/role.enum';

export class CreateUserDto {
  @ApiProperty({ example: 'your name' })
  @IsNotEmpty()
  @IsString()
  firstname!: string;

  @ApiProperty({ example: 'your family name' })
  @IsNotEmpty()
  @IsString()
  lastname!: string;

  @ApiProperty({ example: 'email@example.com' })
  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Password!' })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ enum: Role, default: Role.APPRENANT })
  @IsOptional()
  @IsEnum(Role)
  role?: Role = Role.APPRENANT;

  @ApiProperty({ example: '+22836145678', required: false })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({ example: 'Développeur Full-Stack', required: false })
  @IsOptional()
  @IsString()
  specialite?: string;
}
