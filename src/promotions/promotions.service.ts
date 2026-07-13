import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Promotion } from './entities/promotion.entity';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { User } from '../users/entities/user.entity';
import { Student } from '../students/entities/student.entity';

@Injectable()
export class PromotionsService {
  constructor(
    @InjectRepository(Promotion)
    private readonly promotionRepository: Repository<Promotion>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
  ) {}

  async create(createPromotionDto: CreatePromotionDto) {
    let formateur: User | undefined;

    if (createPromotionDto.formateurId) {
      const found = await this.userRepository.findOne({
        where: { id: createPromotionDto.formateurId },
      });
      if (!found) throw new NotFoundException('Formateur introuvable');
      formateur = found;
    }

    const promotion = this.promotionRepository.create({
      ...createPromotionDto,
      formateur,
    });

    return this.promotionRepository.save(promotion);
  }

  async findAll() {
    const promotions = await this.promotionRepository.find({
      relations: { formateur: true },
    });

    const result = await Promise.all(
      promotions.map(async (promotion) => {
        const membresCount = await this.studentRepository.count({
          where: { promotion: { id: promotion.id } },
        });
        return { ...promotion, membresCount };
      }),
    );

    return result;
  }

  async findOne(id: string) {
    const promotion = await this.promotionRepository.findOne({
      where: { id },
      relations: { formateur: true },
    });
    if (!promotion) throw new NotFoundException('Promotion introuvable');
    return promotion;
  }

  async update(id: string, updatePromotionDto: UpdatePromotionDto) {
    const promotion = await this.findOne(id);

    if (promotion.isArchived) {
      throw new BadRequestException('Impossible de modifier une promotion archivée');
    }

    if (updatePromotionDto.formateurId) {
      const formateur = await this.userRepository.findOne({
        where: { id: updatePromotionDto.formateurId },
      });
      if (!formateur) throw new NotFoundException('Formateur introuvable');
      promotion.formateur = formateur;
    }

    Object.assign(promotion, updatePromotionDto);
    return this.promotionRepository.save(promotion);
  }

  async archive(id: string) {
    const promotion = await this.findOne(id);
    promotion.isArchived = true;
    return this.promotionRepository.save(promotion);
  }

  async addApprenant(promotionId: string, studentId: string) {
    const promotion = await this.promotionRepository.findOne({
      where: { id: promotionId },
    });
    if (!promotion) throw new NotFoundException('Promotion introuvable');
    if (promotion.isArchived) throw new BadRequestException('Impossible d\'affecter à une promotion archivée');

    const student = await this.studentRepository.findOne({
      where: { id: studentId },
    });
    if (!student) throw new NotFoundException('Apprenant introuvable');

    await this.studentRepository
      .createQueryBuilder()
      .relation(Student, 'promotion')
      .of(student.id)
      .set(promotion.id);

    return this.studentRepository.findOne({
      where: { id: studentId },
      relations: { user: true, promotion: true },
    });
  }

  async remove(id: string) {
    const promotion = await this.findOne(id);
    return this.promotionRepository.remove(promotion);
  }
}