import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Promotion } from './entities/promotion.entity';
import { User } from '../users/entities/user.entity';
import { Projet } from '../projets/entities/projet.entity';
import { ProjetPoste } from '../projets/entities/projet-poste.entity';
import { Role } from '../common/enums/role.enum';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { AssignApprenantsDto } from './dto/assign-apprenants.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../common/enums/notification-type.enum';

export interface CurrentUserPayload {
  sub: string;
  role: Role;
}

@Injectable()
export class PromotionsService {
  constructor(
    @InjectRepository(Promotion)
    private readonly promotionRepository: Repository<Promotion>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Projet)
    private readonly projetRepository: Repository<Projet>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(createPromotionDto: CreatePromotionDto): Promise<Promotion> {
    if (createPromotionDto.formateurId) {
      await this.validateFormateurId(createPromotionDto.formateurId);
    }
    await this.validateUniqueName(createPromotionDto.name);
    const promotion = this.promotionRepository.create(createPromotionDto);
    return this.promotionRepository.save(promotion);
  }

  async findAll(
    includeArchived = false,
    currentUser?: CurrentUserPayload,
  ): Promise<Promotion[]> {
    const promotions = await this.promotionRepository.find({
      where: includeArchived ? {} : { isArchived: false },
      relations: { apprenants: true, formateur: true },
      order: { createdAt: 'ASC' },
    });
    for (const promotion of promotions) {
      promotion.apprenants = this.filterActiveApprenants(promotion.apprenants);
    }
    // Un FORMATEUR ne voit que ses propres promotions dans la liste ("Mes
    // promotions") — sinon la liste fuit les apprenants (nom, email...) de
    // toutes les promotions à tous les formateurs, au-delà de ce que
    // assertCanManage bloque déjà sur les actions d'écriture individuelles.
    if (currentUser?.role === Role.FORMATEUR) {
      return promotions.filter(
        (promotion) => promotion.formateurId === currentUser.sub,
      );
    }
    return promotions;
  }

  async findOne(
    id: string,
    currentUser?: CurrentUserPayload,
  ): Promise<Promotion> {
    const promotion = await this.promotionRepository.findOne({
      where: { id },
      relations: { apprenants: true, formateur: true },
    });
    if (!promotion) {
      throw new NotFoundException(`Promotion ${id} non trouvée`);
    }
    if (currentUser) {
      this.assertCanManage(promotion, currentUser);
    }
    promotion.apprenants = this.filterActiveApprenants(promotion.apprenants);
    return promotion;
  }

  /**
   * La relation OneToMany `apprenants` n'est pas filtrable directement par
   * `isDeleted` au niveau du find() (elle inclurait les apprenants
   * soft-supprimés). On l'aligne ici avec UsersService.findAll/findOne, qui
   * excluent déjà isDeleted=true, pour que le compteur et la liste affichés
   * restent cohérents avec les utilisateurs réellement actifs.
   */
  private filterActiveApprenants(apprenants: User[]): User[] {
    return (apprenants ?? []).filter((apprenant) => !apprenant.isDeleted);
  }

  /**
   * Un FORMATEUR ne peut gérer que ses propres promotions ; seul le
   * SUPER_ADMIN peut agir sur n'importe quelle promotion.
   */
  private assertCanManage(
    promotion: Promotion,
    currentUser: CurrentUserPayload,
  ): void {
    if (
      currentUser.role === Role.FORMATEUR &&
      promotion.formateurId !== currentUser.sub
    ) {
      throw new ForbiddenException(
        "Vous n'êtes pas le formateur de cette promotion",
      );
    }
  }

  async update(
    id: string,
    updatePromotionDto: UpdatePromotionDto,
    currentUser: CurrentUserPayload,
  ): Promise<Promotion> {
    if (updatePromotionDto.formateurId) {
      await this.validateFormateurId(updatePromotionDto.formateurId);
    }
    const existing = await this.findOne(id);
    this.assertCanManage(existing, currentUser);
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
      throw new ConflictException(`Une promotion nommée "${name}" existe déjà`);
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

  async archive(
    id: string,
    currentUser: CurrentUserPayload,
  ): Promise<Promotion> {
    const promotion = await this.findOne(id);
    this.assertCanManage(promotion, currentUser);
    promotion.isArchived = true;
    const saved = await this.promotionRepository.save(promotion);
    // L'archivage d'une promotion archive aussi ses projets (et vice-versa
    // à la réactivation, voir unarchive()) : un projet n'a pas de sens
    // actif sur une promotion qui ne l'est plus.
    await this.projetRepository.update(
      { promotionId: id },
      { isArchived: true },
    );
    return saved;
  }

  async unarchive(
    id: string,
    currentUser: CurrentUserPayload,
  ): Promise<Promotion> {
    const promotion = await this.findOne(id);
    this.assertCanManage(promotion, currentUser);
    promotion.isArchived = false;
    const saved = await this.promotionRepository.save(promotion);
    await this.projetRepository.update(
      { promotionId: id },
      { isArchived: false },
    );
    return saved;
  }

  async assignApprenants(
    id: string,
    dto: AssignApprenantsDto,
    currentUser: CurrentUserPayload,
  ): Promise<Promotion> {
    const promotion = await this.findOne(id);
    this.assertCanManage(promotion, currentUser);
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

    // Un apprenant n'appartient qu'à une seule promotion à la fois.
    const dejaAilleurs = apprenants.find(
      (user) => user.promotionId && user.promotionId !== id,
    );
    if (dejaAilleurs) {
      throw new BadRequestException(
        `L'apprenant ${dejaAilleurs.id} appartient déjà à une autre promotion`,
      );
    }

    for (const apprenant of apprenants) {
      apprenant.promotionId = promotion.id;
    }
    await this.userRepository.save(apprenants);

    await this.notificationsService.notifyMany(
      apprenants.map((a) => a.id),
      NotificationType.AFFECTATION_PROMOTION,
      'Nouvelle promotion',
      `Vous avez été affecté à la promotion "${promotion.name}"`,
      '/dashboard/student/promotion',
    );

    return this.findOne(id);
  }

  async removeApprenant(
    id: string,
    userId: string,
    currentUser: CurrentUserPayload,
  ): Promise<Promotion> {
    const promotion = await this.findOne(id);
    this.assertCanManage(promotion, currentUser);
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

    // Retirer un apprenant de la promotion doit aussi révoquer son accès
    // aux projets de cette promotion : sans ça, ProjetsService.findMine()
    // (qui se base uniquement sur le roster ProjetPoste, pas sur
    // apprenant.promotionId) continue de lui montrer ces projets, et
    // SoumissionsService.create() le laisse toujours y soumettre. On
    // supprime donc ses lignes de roster pour tous les projets de cette
    // promotion ; les soumissions déjà faites restent en base (historique
    // de notation) mais ne lui sont plus accessibles sans entrée de roster.
    const projetIds = (
      await this.projetRepository.find({
        where: { promotionId: id },
        select: { id: true },
      })
    ).map((projet) => projet.id);
    if (projetIds.length > 0) {
      await this.projetRepository.manager
        .getRepository(ProjetPoste)
        .delete({ projetId: In(projetIds), apprenantId: userId });
    }

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

    user.promotion.apprenants = this.filterActiveApprenants(
      user.promotion.apprenants,
    );
    const camarades = user.promotion.apprenants.filter(
      (apprenant) => apprenant.id !== userId,
    );
    return { promotion: user.promotion, camarades };
  }
}
