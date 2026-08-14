import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAnnonceDto {
  @ApiProperty({
    example: 'b3f1c9a0-...',
    description: 'ID de la promotion ciblée par l’annonce',
  })
  @IsUUID()
  promotionId!: string;

  @ApiProperty({ example: 'Changement de salle - Semaine 3' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  title!: string;

  @ApiProperty({
    example: 'Les cours de la semaine 3 se tiendront en salle B12.',
  })
  @IsNotEmpty()
  @IsString()
  content!: string;
}
