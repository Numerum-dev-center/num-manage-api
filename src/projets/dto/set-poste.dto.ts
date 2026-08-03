import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PosteProjet } from '../../common/enums/poste-projet.enum';

export class SetPosteDto {
  @ApiProperty({ enum: PosteProjet, example: PosteProjet.FRONTEND })
  @IsEnum(PosteProjet)
  poste!: PosteProjet;
}
