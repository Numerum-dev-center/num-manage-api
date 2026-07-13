import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
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
}
