import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { Role } from '../../common/enums/role.enum';

export class UpdateUserDto {
  @ApiProperty({ required: false, example: 'Jean' })
  @IsOptional()
  @IsString()
  firstname?: string;

  @ApiProperty({ required: false, example: 'Dupont' })
  @IsOptional()
  @IsString()
  lastname?: string;

  @ApiProperty({ required: false, example: 'jean.dupont@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false, enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiProperty({ required: false, example: '+33612345678' })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({ required: false, example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}