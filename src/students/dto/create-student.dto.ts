import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsEnum, IsOptional } from 'class-validator';
import { StudentStatus } from '../entities/student.entity';

export class CreateStudentDto {
  @ApiProperty()
  @IsUUID()
  userId!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  promotionId?: string;

  @ApiProperty({ enum: StudentStatus, required: false })
  @IsOptional()
  @IsEnum(StudentStatus)
  status?: StudentStatus;
}
