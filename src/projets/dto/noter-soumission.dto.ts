import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class NoterSoumissionDto {
  @ApiProperty({ example: 16, minimum: 0, maximum: 20 })
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  @Max(20)
  note!: number;

  @ApiProperty({ required: false, example: 'Bon travail, structure claire.' })
  @IsOptional()
  @IsString()
  feedback?: string;
}
