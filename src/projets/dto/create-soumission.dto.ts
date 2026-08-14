import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSoumissionDto {
  @ApiProperty({ example: 'https://github.com/mon-compte/mon-projet' })
  @IsNotEmpty()
  @IsUrl()
  @MaxLength(500)
  lienGithub!: string;

  @ApiProperty({ example: 'https://mon-projet.vercel.app' })
  @IsNotEmpty()
  @IsUrl()
  @MaxLength(500)
  lienDemo!: string;

  @ApiProperty({ required: false, example: 'Fonctionnalité bonus ajoutée.' })
  @IsOptional()
  @IsString()
  commentaire?: string;
}
