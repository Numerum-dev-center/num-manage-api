import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Projet } from './entities/projet.entity';
import { Soumission } from './entities/soumission.entity';
import { ProjetPoste } from './entities/projet-poste.entity';
import { Promotion } from '../promotions/entities/promotion.entity';
import { User } from '../users/entities/user.entity';
import { Role } from '../common/enums/role.enum';
import { StatutProjet } from '../common/enums/statut-projet.enum';
import { PosteProjet } from '../common/enums/poste-projet.enum';
import { CreateProjetDto } from './dto/create-projet.dto';
import { UpdateProjetDto } from './dto/update-projet.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../common/enums/notification-type.enum';

export interface ProjetAvecStats extends Projet {
  statut: StatutProjet;
  enRetard: boolean;
  totalApprenants: number;
  totalSoumissions: number;
  totalEvaluees: number;
}

export interface ProjetPourApprenant extends Projet {
  statut: StatutProjet;
  enRetard: boolean;
  maSoumission: Soumission | null;
  maPoste: PosteProjet | null;
}

type ApprenantResume = Pick<
  User,
  'id' | 'firstname' | 'lastname' | 'email' | 'specialite'
>;

export interface ApprenantAvecPoste {
  apprenant: ApprenantResume;
  poste: PosteProjet | null;
}

@Injectable()
export class ProjetsService {
  constructor(
    @InjectRepository(Projet)
    private readonly projetRepository: Repository<Projet>,
    @InjectRepository(Soumission)
    private readonly soumissionRepository: Repository<Soumission>,
    @InjectRepository(ProjetPoste)
    private readonly projetPosteRepository: Repository<ProjetPoste>,
    @InjectRepository(Promotion)
    private readonly promotionRepository: Repository<Promotion>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateProjetDto, createdById: string): Promise<Projet> {
    const promotion = await this.promotionRepository.findOne({
      where: { id: dto.promotionId },
    });
    if (!promotion) {
      throw new NotFoundException(`Promotion ${dto.promotionId} non trouvée`);
    }
    if (promotion.isArchived) {
      throw new BadRequestException(
        'Impossible de créer un projet sur une promotion archivée',
      );
    }

    const projet = this.projetRepository.create({
      titre: dto.titre,
      description: dto.description,
      technologies: dto.technologies,
      dateLimite: new Date(dto.dateLimite),
      promotionId: dto.promotionId,
      createdById,
    });
    const saved = await this.projetRepository.save(projet);
    return this.findOne(saved.id);
  }

  async findOne(id: string): Promise<Projet> {
    const projet = await this.projetRepository.findOne({
      where: { id },
      relations: { promotion: true, createdBy: true, soumissions: true },
    });
    if (!projet) {
      throw new NotFoundException(`Projet ${id} non trouvé`);
    }
    return projet;
  }

  async findAllForManager(includeArchived = false): Promise<ProjetAvecStats[]> {
    const projets = await this.projetRepository.find({
      where: includeArchived ? {} : { isArchived: false },
      relations: {
        promotion: true,
        createdBy: true,
        soumissions: true,
        postes: true,
      },
      order: { createdAt: 'DESC' },
    });

    return projets.map((projet) => this.withStats(projet));
  }

  async update(id: string, dto: UpdateProjetDto): Promise<Projet> {
    await this.findOne(id);
    await this.projetRepository.update(id, {
      ...dto,
      dateLimite: dto.dateLimite ? new Date(dto.dateLimite) : undefined,
    });
    return this.findOne(id);
  }

  async archive(id: string): Promise<Projet> {
    const projet = await this.findOne(id);
    projet.isArchived = true;
    return this.projetRepository.save(projet);
  }

  async unarchive(id: string): Promise<Projet> {
    const projet = await this.findOne(id);
    projet.isArchived = false;
    return this.projetRepository.save(projet);
  }

  async remove(id: string): Promise<void> {
    const projet = await this.findOne(id);
    await this.projetRepository.remove(projet);
  }

  async findOneForManager(id: string): Promise<ProjetAvecStats> {
    const projet = await this.projetRepository.findOne({
      where: { id },
      relations: {
        promotion: true,
        createdBy: true,
        soumissions: true,
        postes: true,
      },
    });
    if (!projet) {
      throw new NotFoundException(`Projet ${id} non trouvé`);
    }
    return this.withStats(projet);
  }

  private withStats(projet: Projet): ProjetAvecStats {
    // Un projet ne cible plus toute la promotion automatiquement : seuls les
    // apprenants explicitement affectés (roster = lignes ProjetPoste) comptent.
    const totalApprenants = projet.postes?.length ?? 0;
    const soumissions = projet.soumissions ?? [];
    const totalSoumissions = soumissions.length;
    const totalEvaluees = soumissions.filter((s) => s.note != null).length;

    let statut: StatutProjet;
    if (totalSoumissions === 0) {
      statut = StatutProjet.EN_COURS;
    } else if (totalApprenants > 0 && totalEvaluees === totalApprenants) {
      statut = StatutProjet.EVALUE;
    } else if (totalApprenants > 0 && totalSoumissions === totalApprenants) {
      statut = StatutProjet.SOUMIS;
    } else {
      statut = StatutProjet.EN_COURS;
    }

    const enRetard =
      new Date() > projet.dateLimite && totalEvaluees < totalApprenants;

    return {
      ...projet,
      statut,
      enRetard,
      totalApprenants,
      totalSoumissions,
      totalEvaluees,
    };
  }

  async findMine(userId: string): Promise<ProjetPourApprenant[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId, isDeleted: false },
    });
    if (!user) {
      throw new NotFoundException(`Utilisateur ${userId} non trouvé`);
    }

    // Seuls les projets où l'apprenant a été explicitement affecté (roster)
    // apparaissent - plus d'inclusion automatique de toute la promotion.
    const postes = await this.projetPosteRepository.find({
      where: { apprenantId: userId },
    });
    if (postes.length === 0) {
      return [];
    }
    const posteParProjet = new Map(postes.map((p) => [p.projetId, p.poste ?? null]));

    const projets = await this.projetRepository.find({
      where: { id: In(postes.map((p) => p.projetId)), isArchived: false },
      relations: { promotion: true, createdBy: true },
      order: { dateLimite: 'ASC' },
    });

    const soumissions = await this.soumissionRepository.find({
      where: { apprenantId: userId },
    });
    const soumissionParProjet = new Map(
      soumissions.map((s) => [s.projetId, s]),
    );

    return projets.map((projet) => {
      const maSoumission = soumissionParProjet.get(projet.id) ?? null;
      const { statut, enRetard } = this.computeStatutApprenant(
        maSoumission,
        projet.dateLimite,
      );
      return {
        ...projet,
        statut,
        enRetard,
        maSoumission,
        maPoste: posteParProjet.get(projet.id) ?? null,
      };
    });
  }

  async getForSoumettre(
    id: string,
    userId: string,
  ): Promise<ProjetPourApprenant> {
    const projet = await this.findOne(id);
    const maPosteEntry = await this.projetPosteRepository.findOne({
      where: { projetId: id, apprenantId: userId },
    });
    if (!maPosteEntry) {
      throw new NotFoundException(`Projet ${id} non trouvé`);
    }

    const maSoumission = await this.soumissionRepository.findOne({
      where: { projetId: id, apprenantId: userId },
    });
    const { statut, enRetard } = this.computeStatutApprenant(
      maSoumission,
      projet.dateLimite,
    );
    return {
      ...projet,
      statut,
      enRetard,
      maSoumission: maSoumission ?? null,
      maPoste: maPosteEntry.poste ?? null,
    };
  }

  /**
   * Affecte explicitement un apprenant de la promotion au roster du projet.
   * Un projet ne cible plus toute la promotion par défaut : c'est cette
   * action (formateur) qui rend l'apprenant éligible à soumettre.
   */
  async addApprenant(projetId: string, apprenantId: string): Promise<ProjetPoste> {
    const projet = await this.projetRepository.findOne({
      where: { id: projetId },
    });
    if (!projet) {
      throw new NotFoundException(`Projet ${projetId} non trouvé`);
    }
    if (projet.isArchived) {
      throw new BadRequestException(
        'Impossible d’affecter un apprenant à un projet archivé',
      );
    }
    const apprenant = await this.userRepository.findOne({
      where: { id: apprenantId, isDeleted: false },
    });
    if (!apprenant || apprenant.promotionId !== projet.promotionId) {
      throw new ForbiddenException(
        "Cet apprenant n'appartient pas à la promotion du projet",
      );
    }

    const existing = await this.projetPosteRepository.findOne({
      where: { projetId, apprenantId },
    });
    if (existing) {
      throw new ConflictException('Cet apprenant est déjà affecté à ce projet');
    }

    const entry = this.projetPosteRepository.create({
      projetId,
      apprenantId,
      poste: null,
    });
    const saved = await this.projetPosteRepository.save(entry);

    await this.notificationsService.notify(
      apprenantId,
      NotificationType.AFFECTATION_PROJET,
      'Nouveau projet',
      `Vous avez été affecté au projet "${projet.titre}"`,
      '/dashboard/student/projets',
    );

    return saved;
  }

  /** Retire un apprenant du roster du projet. */
  async removeApprenantFromProjet(
    projetId: string,
    apprenantId: string,
  ): Promise<void> {
    const entry = await this.projetPosteRepository.findOne({
      where: { projetId, apprenantId },
    });
    if (!entry) {
      throw new NotFoundException(
        `Apprenant ${apprenantId} non affecté à ce projet`,
      );
    }
    await this.projetPosteRepository.remove(entry);
  }

  /**
   * Change le poste d'un apprenant déjà affecté au projet. Appelable par le
   * formateur ou par l'apprenant lui-même, mais uniquement s'il est déjà
   * sur le roster (le poste ne crée pas l'affectation, il la précise).
   */
  async setPoste(
    projetId: string,
    apprenantId: string,
    poste: PosteProjet,
  ): Promise<ProjetPoste> {
    const entry = await this.projetPosteRepository.findOne({
      where: { projetId, apprenantId },
    });
    if (!entry) {
      throw new NotFoundException(
        "Cet apprenant n'est pas affecté à ce projet",
      );
    }
    entry.poste = poste;
    return this.projetPosteRepository.save(entry);
  }

  /** Roster du projet : uniquement les apprenants explicitement affectés. */
  async findPostesForProjet(projetId: string): Promise<ApprenantAvecPoste[]> {
    const projet = await this.projetRepository.findOne({
      where: { id: projetId },
    });
    if (!projet) {
      throw new NotFoundException(`Projet ${projetId} non trouvé`);
    }

    const postes = await this.projetPosteRepository.find({
      where: { projetId },
      relations: { apprenant: true },
    });

    return postes.map((entry) => ({
      apprenant: {
        id: entry.apprenant.id,
        firstname: entry.apprenant.firstname,
        lastname: entry.apprenant.lastname,
        email: entry.apprenant.email,
        specialite: entry.apprenant.specialite,
      },
      poste: entry.poste ?? null,
    }));
  }

  /** Apprenants de la promotion du projet pas encore affectés (pour le picker "ajouter"). */
  async findApprenantsDisponibles(projetId: string): Promise<ApprenantResume[]> {
    const projet = await this.projetRepository.findOne({
      where: { id: projetId },
      relations: { promotion: { apprenants: true } },
    });
    if (!projet) {
      throw new NotFoundException(`Projet ${projetId} non trouvé`);
    }

    const postes = await this.projetPosteRepository.find({
      where: { projetId },
    });
    const dejaAffectes = new Set(postes.map((p) => p.apprenantId));

    return (projet.promotion?.apprenants ?? [])
      .filter((apprenant) => !dejaAffectes.has(apprenant.id))
      .map((apprenant) => ({
        id: apprenant.id,
        firstname: apprenant.firstname,
        lastname: apprenant.lastname,
        email: apprenant.email,
        specialite: apprenant.specialite,
      }));
  }

  private computeStatutApprenant(
    soumission: Soumission | null,
    dateLimite: Date,
  ): { statut: StatutProjet; enRetard: boolean } {
    if (!soumission) {
      return {
        statut: StatutProjet.EN_COURS,
        enRetard: new Date() > dateLimite,
      };
    }
    if (soumission.note != null) {
      return { statut: StatutProjet.EVALUE, enRetard: false };
    }
    return { statut: StatutProjet.SOUMIS, enRetard: false };
  }

  async getFormOptions(): Promise<{
    formateurs: Pick<User, 'id' | 'firstname' | 'lastname'>[];
    promotions: Pick<Promotion, 'id' | 'name'>[];
  }> {
    const [formateurs, promotions] = await Promise.all([
      this.userRepository.find({
        where: { role: Role.FORMATEUR, isDeleted: false },
        select: { id: true, firstname: true, lastname: true },
      }),
      this.promotionRepository.find({
        where: { isArchived: false },
        select: { id: true, name: true },
      }),
    ]);
    return { formateurs, promotions };
  }
}
