import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Annonce } from './entities/annonce.entity';
import { Promotion } from '../promotions/entities/promotion.entity';
import { User } from '../users/entities/user.entity';
import { Role } from '../common/enums/role.enum';
import { CreateAnnonceDto } from './dto/create-annonce.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../common/enums/notification-type.enum';

@Injectable()
export class AnnoncesService {
  constructor(
    @InjectRepository(Annonce)
    private readonly annonceRepository: Repository<Annonce>,
    @InjectRepository(Promotion)
    private readonly promotionRepository: Repository<Promotion>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(
    dto: CreateAnnonceDto,
    currentUser: { sub: string; role: Role },
  ): Promise<Annonce> {
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
    // Un FORMATEUR ne peut publier que sur les promotions qu'il encadre
    // (promotion.formateurId). Un SUPER_ADMIN n'est jamais restreint.
    if (
      currentUser.role === Role.FORMATEUR &&
      promotion.formateurId !== currentUser.sub
    ) {
      throw new ForbiddenException(
        "Vous n'encadrez pas cette promotion, vous ne pouvez pas y publier d'annonce",
      );
    }

    const annonce = this.annonceRepository.create({
      title: dto.title,
      content: dto.content,
      promotionId: dto.promotionId,
      createdById: currentUser.sub,
    });
    const saved = await this.annonceRepository.save(annonce);

    const apprenants = await this.userRepository.find({
      where: {
        promotionId: dto.promotionId,
        role: Role.APPRENANT,
        isDeleted: false,
      },
    });
    await this.notificationsService.notifyMany(
      apprenants.map((a) => a.id),
      NotificationType.NOUVELLE_ANNONCE,
      'Nouvelle annonce',
      dto.title,
      '/dashboard/student/annonces',
    );

    return saved;
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
