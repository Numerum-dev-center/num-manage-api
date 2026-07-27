import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignApprenantsDto {
  @ApiProperty({ example: ['b3f1c9a0-...', 'a1e2d3c4-...'], type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  apprenantIds!: string[];
}
