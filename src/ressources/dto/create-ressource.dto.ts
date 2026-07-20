import { IsOptional, IsString, IsUUID, IsUrl } from 'class-validator';
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
    description:
      'Titre affiché ; par défaut le nom du fichier envoyé (ou le lien)',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    example: 'https://drive.google.com/file/d/...',
    required: false,
    description:
      'Lien externe vers la ressource ; alternative à l’envoi d’un fichier (fournir l’un ou l’autre, pas les deux)',
  })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  url?: string;
}
