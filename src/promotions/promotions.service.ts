import {
  BadRequestException,
  ConflictException,
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
    if (createPromotionDto.formateurId) {
      await this.validateFormateurId(createPromotionDto.formateurId);
    }
    await this.validateUniqueName(createPromotionDto.name);
    const promotion = this.promotionRepository.create(createPromotionDto);
    return this.promotionRepository.save(promotion);
  }

  async findAll(includeArchived = false): Promise<Promotion[]> {
    return this.promotionRepository.find({
      where: includeArchived ? {} : { isArchived: false },
      relations: { apprenants: true, formateur: true },
    });
  }

  async findOne(id: string): Promise<Promotion> {
    const promotion = await this.promotionRepository.findOne({
      where: { id },
      relations: { apprenants: true, formateur: true },
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
    if (updatePromotionDto.formateurId) {
      await this.validateFormateurId(updatePromotionDto.formateurId);
    }
    await this.findOne(id);
    if (updatePromotionDto.name) {
      await this.validateUniqueName(updatePromotionDto.name, id);
    }
    // Utilise une mise à jour directe par colonnes plutôt qu'un Object.assign +
    // save() sur l'entité : la relation `formateur` chargée par findOne() garderait
    // sinon sa valeur périmée et écraserait le nouveau formateurId lors du save().
    await this.promotionRepository.update(id, updatePromotionDto);
    return this.findOne(id);
  }

  private async validateUniqueName(
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.promotionRepository.findOne({
      where: { name },
    });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(
        `Une promotion nommée "${name}" existe déjà`,
      );
    }
  }

  private async validateFormateurId(formateurId: string): Promise<void> {
    const formateur = await this.userRepository.findOne({
      where: { id: formateurId, isDeleted: false },
    });
    if (!formateur) {
      throw new BadRequestException(`Formateur ${formateurId} introuvable`);
    }
    if (formateur.role !== Role.FORMATEUR) {
      throw new BadRequestException(
        `L'utilisateur ${formateurId} n'a pas le rôle formateur`,
      );
    }
  }

  async archive(id: string): Promise<Promotion> {
    const promotion = await this.findOne(id);
    promotion.isArchived = true;
    return this.promotionRepository.save(promotion);
  }

  async unarchive(id: string): Promise<Promotion> {
    const promotion = await this.findOne(id);
    promotion.isArchived = false;
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
