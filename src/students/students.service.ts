import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student } from './entities/student.entity';
import { User } from '../users/entities/user.entity';
import { Promotion } from '../promotions/entities/promotion.entity';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { Role } from '../common/enums/role.enum';

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

    if (user.role !== Role.APPRENANT) {
      throw new BadRequestException(
        'Cet utilisateur doit avoir le rôle apprenant',
      );
    }

    const existing = await this.studentRepository.findOne({
      where: { user: { id: createStudentDto.userId } },
    });
    if (existing)
      throw new ConflictException('Cet utilisateur est déjà un apprenant');

    // users.promotionId (géré par PromotionsService.assignApprenants/removeApprenant)
    // est l'unique source de vérité pour l'affectation d'un apprenant à une promotion.
    // On refuse toute promotionId fournie ici qui ne correspondrait pas à cette
    // affectation, pour éviter deux modèles désynchronisés.
    if (
      createStudentDto.promotionId &&
      createStudentDto.promotionId !== user.promotionId
    ) {
      throw new ConflictException(
        'La promotion fournie ne correspond pas à la promotion actuelle de cet apprenant (users.promotionId). ' +
          'Utilisez POST /promotions/:id/apprenants pour affecter cet apprenant à une promotion.',
      );
    }

    let promotion: Promotion | undefined;
    if (user.promotionId) {
      const found = await this.promotionRepository.findOne({
        where: { id: user.promotionId },
      });
      if (!found) throw new NotFoundException('Promotion introuvable');
      if (found.isArchived)
        throw new ConflictException(
          "Impossible d'affecter à une promotion archivée",
        );
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
      // Même garde-fou qu'à la création : users.promotionId reste l'unique
      // source de vérité, on ne laisse pas /students diverger.
      if (updateStudentDto.promotionId !== student.user.promotionId) {
        throw new ConflictException(
          'La promotion fournie ne correspond pas à la promotion actuelle de cet apprenant (users.promotionId). ' +
            "Utilisez POST /promotions/:id/apprenants pour changer l'affectation de promotion de cet apprenant.",
        );
      }

      const promotion = await this.promotionRepository.findOne({
        where: { id: updateStudentDto.promotionId },
      });
      if (!promotion) throw new NotFoundException('Promotion introuvable');
      if (promotion.isArchived)
        throw new ConflictException(
          "Impossible d'affecter à une promotion archivée",
        );
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
