import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Promotion } from './entities/promotion.entity';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class PromotionsService {
  constructor(
    @InjectRepository(Promotion)
    private readonly promotionRepository: Repository<Promotion>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
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
    return this.promotionRepository.find({
      relations: { formateur: true },
    });
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

  async remove(id: string) {
    const promotion = await this.findOne(id);
    return this.promotionRepository.remove(promotion);
  }
}