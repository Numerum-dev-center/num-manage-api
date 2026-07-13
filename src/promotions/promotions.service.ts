import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Promotion } from './entities/promotion.entity';
import { User } from '../users/entities/user.entity';
import { Role } from '../common/enums/role.enum';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { AssignApprenantsDto } from './dto/assign-apprenants.dto';

@Injectable()
export class PromotionsService {
  constructor(
    @InjectRepository(Promotion)
    private readonly promotionRepository: Repository<Promotion>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createPromotionDto: CreatePromotionDto): Promise<Promotion> {
    const promotion = this.promotionRepository.create(createPromotionDto);
    return this.promotionRepository.save(promotion);
  }

  async findAll(includeArchived = false): Promise<Promotion[]> {
    return this.promotionRepository.find({
      where: includeArchived ? {} : { isArchived: false },
      relations: { apprenants: true },
    });
  }

  async findOne(id: string): Promise<Promotion> {
    const promotion = await this.promotionRepository.findOne({
      where: { id },
      relations: { apprenants: true },
    });
    if (!promotion) {
      throw new NotFoundException(`Promotion ${id} non trouvée`);
    }
    return promotion;
  }

  async update(
    id: string,
    updatePromotionDto: UpdatePromotionDto,
  ): Promise<Promotion> {
    const promotion = await this.findOne(id);
    Object.assign(promotion, updatePromotionDto);
    return this.promotionRepository.save(promotion);
  }

  async archive(id: string): Promise<Promotion> {
    const promotion = await this.findOne(id);
    promotion.isArchived = true;
    return this.promotionRepository.save(promotion);
  }

  async assignApprenants(
    id: string,
    dto: AssignApprenantsDto,
  ): Promise<Promotion> {
    const promotion = await this.findOne(id);
    if (promotion.isArchived) {
      throw new BadRequestException(
        'Impossible d’affecter des apprenants à une promotion archivée',
      );
    }

    const apprenants = await this.userRepository.find({
      where: { id: In(dto.apprenantIds), isDeleted: false },
    });
    if (apprenants.length !== dto.apprenantIds.length) {
      throw new BadRequestException(
        'Un ou plusieurs apprenants sont introuvables',
      );
    }
    const nonApprenant = apprenants.find(
      (user) => user.role !== Role.APPRENANT,
    );
    if (nonApprenant) {
      throw new BadRequestException(
        `L'utilisateur ${nonApprenant.id} n'a pas le rôle apprenant`,
      );
    }

    for (const apprenant of apprenants) {
      apprenant.promotionId = promotion.id;
    }
    await this.userRepository.save(apprenants);

    return this.findOne(id);
  }

  async removeApprenant(id: string, userId: string): Promise<Promotion> {
    const promotion = await this.findOne(id);
    const apprenant = await this.userRepository.findOne({
      where: { id: userId, isDeleted: false, promotionId: id },
    });
    if (!apprenant) {
      throw new NotFoundException(
        `Apprenant ${userId} non trouvé dans la promotion ${id}`,
      );
    }
    apprenant.promotionId = null;
    await this.userRepository.save(apprenant);

    return this.findOne(promotion.id);
  }

  async findMyPromotion(
    userId: string,
  ): Promise<{ promotion: Promotion | null; camarades: User[] }> {
    const user = await this.userRepository.findOne({
      where: { id: userId, isDeleted: false },
      relations: { promotion: { apprenants: true } },
    });
    if (!user) {
      throw new NotFoundException(`Utilisateur ${userId} non trouvé`);
    }
    if (!user.promotion) {
      return { promotion: null, camarades: [] };
    }

    const camarades = user.promotion.apprenants.filter(
      (apprenant) => apprenant.id !== userId,
    );
    return { promotion: user.promotion, camarades };
  }
}
