import { IsDateString, IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProjetDto {
  @ApiProperty({ example: "Développement d'une API RESTful avec Node.js" })
  @IsNotEmpty()
  @IsString()
  titre!: string;

  @ApiProperty({
    example: "Créer les routes d'authentification JWT et le CRUD de stock.",
  })
  @IsNotEmpty()
  @IsString()
  description!: string;

  @ApiProperty({ example: 'Node.js, Express, MySQL' })
  @IsNotEmpty()
  @IsString()
  technologies!: string;

  @ApiProperty({ example: '2026-08-15T23:59:00' })
  @IsNotEmpty()
  @IsDateString()
  dateLimite!: string;

  @ApiProperty({ example: 'b3f1c9a0-...' })
  @IsNotEmpty()
  @IsUUID()
  promotionId!: string;
}
