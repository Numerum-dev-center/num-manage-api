import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student } from './entities/student.entity';
import { User } from '../users/entities/user.entity';
import { Promotion } from '../promotions/entities/promotion.entity';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Promotion)
    private readonly promotionRepository: Repository<Promotion>,
  ) {}

  async create(createStudentDto: CreateStudentDto) {
    const user = await this.userRepository.findOne({
      where: { id: createStudentDto.userId },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const existing = await this.studentRepository.findOne({
      where: { user: { id: createStudentDto.userId } },
    });
    if (existing) throw new ConflictException('Cet utilisateur est déjà un apprenant');

    let promotion: Promotion | undefined;
    if (createStudentDto.promotionId) {
      const found = await this.promotionRepository.findOne({
        where: { id: createStudentDto.promotionId },
      });
      if (!found) throw new NotFoundException('Promotion introuvable');
      if (found.isArchived) throw new ConflictException('Impossible d\'affecter à une promotion archivée');
      promotion = found;
    }

    const student = this.studentRepository.create({
      user,
      promotion,
      status: createStudentDto.status,
    });

    return this.studentRepository.save(student);
  }

  async findAll() {
    return this.studentRepository.find({
      relations: { user: true, promotion: true },
    });
  }

  async findOne(id: string) {
    const student = await this.studentRepository.findOne({
      where: { id },
      relations: { user: true, promotion: true },
    });
    if (!student) throw new NotFoundException('Apprenant introuvable');
    return student;
  }

  async update(id: string, updateStudentDto: UpdateStudentDto) {
    const student = await this.findOne(id);

    if (updateStudentDto.promotionId) {
      const promotion = await this.promotionRepository.findOne({
        where: { id: updateStudentDto.promotionId },
      });
      if (!promotion) throw new NotFoundException('Promotion introuvable');
      if (promotion.isArchived) throw new ConflictException('Impossible d\'affecter à une promotion archivée');
      student.promotion = promotion;
    }

    if (updateStudentDto.status) {
      student.status = updateStudentDto.status;
    }

    return this.studentRepository.save(student);
  }

  async remove(id: string) {
    const student = await this.findOne(id);
    return this.studentRepository.remove(student);
  }
}