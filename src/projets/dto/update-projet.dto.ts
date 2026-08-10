import { IsDateString, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProjetDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  titre?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  technologies?: string;

  @ApiProperty({ required: false, example: '2026-08-15T23:59:00' })
  @IsOptional()
  @IsDateString()
  dateLimite?: string;
}
