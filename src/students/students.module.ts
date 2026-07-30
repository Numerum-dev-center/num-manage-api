import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';
import { Student } from './entities/student.entity';
import { User } from '../users/entities/user.entity';
import { Promotion } from '../promotions/entities/promotion.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Student, User, Promotion])],
  controllers: [StudentsController],
  providers: [StudentsService],
})
export class StudentsModule {}
