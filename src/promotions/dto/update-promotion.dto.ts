import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePromotionDto {
  @ApiProperty({ example: 'Promotion Dev Web 2026', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    example: 'Formation développement web full-stack',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}
