import { IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRessourceDto {
  @ApiProperty({
    example: 'b3f1c9a0-...',
    description: 'ID de la promotion ciblée par la ressource',
  })
  @IsUUID()
  promotionId!: string;

  @ApiProperty({
    example: 'Support de cours - Semaine 1',
    required: false,
    description: 'Titre affiché ; par défaut le nom du fichier envoyé',
  })
  @IsOptional()
  @IsString()
  title?: string;
}
