import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Annonce } from './entities/annonce.entity';
import { Promotion } from '../promotions/entities/promotion.entity';
import { User } from '../users/entities/user.entity';
import { CreateAnnonceDto } from './dto/create-annonce.dto';

@Injectable()
export class AnnoncesService {
  constructor(
    @InjectRepository(Annonce)
    private readonly annonceRepository: Repository<Annonce>,
    @InjectRepository(Promotion)
    private readonly promotionRepository: Repository<Promotion>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(dto: CreateAnnonceDto, createdById: string): Promise<Annonce> {
    const promotion = await this.promotionRepository.findOne({
      where: { id: dto.promotionId },
    });
    if (!promotion) {
      throw new NotFoundException(`Promotion ${dto.promotionId} non trouvée`);
    }
    if (promotion.isArchived) {
      throw new BadRequestException(
        'Impossible de publier une annonce sur une promotion archivée',
      );
    }

    const annonce = this.annonceRepository.create({
      title: dto.title,
      content: dto.content,
      promotionId: dto.promotionId,
      createdById,
    });
    return this.annonceRepository.save(annonce);
  }

  async findAllForManager(promotionId?: string): Promise<Annonce[]> {
    return this.annonceRepository.find({
      where: promotionId ? { promotionId } : {},
      relations: { promotion: true, createdBy: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findMine(userId: string): Promise<Annonce[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId, isDeleted: false },
    });
    if (!user) {
      throw new NotFoundException(`Utilisateur ${userId} non trouvé`);
    }
    if (!user.promotionId) {
      return [];
    }
    return this.annonceRepository.find({
      where: { promotionId: user.promotionId },
      relations: { createdBy: true },
      order: { createdAt: 'DESC' },
    });
  }
}
