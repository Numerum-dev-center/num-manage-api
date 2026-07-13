import { IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePromotionDto {
  @ApiProperty({ example: 'Promotion Dev Web 2026' })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiProperty({
    example: 'Formation développement web full-stack',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '2026-01-12', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ example: '2026-12-19', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ example: 'b3f1c9a0-...', required: false, description: "ID de l'utilisateur Formateur responsable" })
  @IsOptional()
  @IsUUID()
  formateurId?: string;
}
