import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSoumissionDto {
  @ApiProperty({ example: 'https://github.com/mon-compte/mon-projet' })
  @IsNotEmpty()
  @IsUrl()
  lienGithub!: string;

  @ApiProperty({ example: 'https://mon-projet.vercel.app' })
  @IsNotEmpty()
  @IsUrl()
  lienDemo!: string;

  @ApiProperty({ required: false, example: 'Fonctionnalité bonus ajoutée.' })
  @IsOptional()
  @IsString()
  commentaire?: string;
}
