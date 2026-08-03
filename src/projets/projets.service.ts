import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Projet } from './entities/projet.entity';
import { Soumission } from './entities/soumission.entity';
import { ProjetPoste } from './entities/projet-poste.entity';
import { Promotion } from '../promotions/entities/promotion.entity';
import { User } from '../users/entities/user.entity';
import { Role } from '../common/enums/role.enum';
import { StatutProjet } from '../common/enums/statut-projet.enum';
import { PosteProjet } from '../common/enums/poste-projet.enum';
import { CreateProjetDto } from './dto/create-projet.dto';

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

export interface ApprenantAvecPoste {
  apprenant: Pick<User, 'id' | 'firstname' | 'lastname' | 'email'>;
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

  async findAllForManager(): Promise<ProjetAvecStats[]> {
    const projets = await this.projetRepository.find({
      relations: {
        promotion: { apprenants: true },
        createdBy: true,
        soumissions: true,
      },
      order: { createdAt: 'DESC' },
    });

    return projets.map((projet) => this.withStats(projet));
  }

  async findOneForManager(id: string): Promise<ProjetAvecStats> {
    const projet = await this.projetRepository.findOne({
      where: { id },
      relations: {
        promotion: { apprenants: true },
        createdBy: true,
        soumissions: true,
      },
    });
    if (!projet) {
      throw new NotFoundException(`Projet ${id} non trouvé`);
    }
    return this.withStats(projet);
  }

  private withStats(projet: Projet): ProjetAvecStats {
    const totalApprenants = projet.promotion?.apprenants?.length ?? 0;
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
    if (!user.promotionId) {
      return [];
    }

    const projets = await this.projetRepository.find({
      where: { promotionId: user.promotionId },
      relations: { promotion: true, createdBy: true },
      order: { dateLimite: 'ASC' },
    });

    const soumissions = await this.soumissionRepository.find({
      where: { apprenantId: userId },
    });
    const soumissionParProjet = new Map(
      soumissions.map((s) => [s.projetId, s]),
    );

    const postes = await this.projetPosteRepository.find({
      where: { apprenantId: userId },
    });
    const posteParProjet = new Map(postes.map((p) => [p.projetId, p.poste]));

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
    const user = await this.userRepository.findOne({
      where: { id: userId, isDeleted: false },
    });
    if (!user || user.promotionId !== projet.promotionId) {
      throw new NotFoundException(`Projet ${id} non trouvé`);
    }

    const maSoumission = await this.soumissionRepository.findOne({
      where: { projetId: id, apprenantId: userId },
    });
    const maPosteEntry = await this.projetPosteRepository.findOne({
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
      maPoste: maPosteEntry?.poste ?? null,
    };
  }

  /**
   * Assigne (ou change) le poste d'un apprenant sur un projet. Appelable par
   * le formateur (affectation initiale) ou par l'apprenant lui-même
   * (correction de son propre poste) - indépendant de la soumission.
   */
  async setPoste(
    projetId: string,
    apprenantId: string,
    poste: PosteProjet,
  ): Promise<ProjetPoste> {
    const projet = await this.projetRepository.findOne({
      where: { id: projetId },
    });
    if (!projet) {
      throw new NotFoundException(`Projet ${projetId} non trouvé`);
    }
    const apprenant = await this.userRepository.findOne({
      where: { id: apprenantId, isDeleted: false },
    });
    if (!apprenant || apprenant.promotionId !== projet.promotionId) {
      throw new ForbiddenException(
        "Cet apprenant n'appartient pas à la promotion du projet",
      );
    }

    let entry = await this.projetPosteRepository.findOne({
      where: { projetId, apprenantId },
    });
    if (entry) {
      entry.poste = poste;
    } else {
      entry = this.projetPosteRepository.create({
        projetId,
        apprenantId,
        poste,
      });
    }
    return this.projetPosteRepository.save(entry);
  }

  /** Postes de tous les apprenants de la promotion du projet (assigné ou non). */
  async findPostesForProjet(projetId: string): Promise<ApprenantAvecPoste[]> {
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
    const posteParApprenant = new Map(postes.map((p) => [p.apprenantId, p.poste]));

    return (projet.promotion?.apprenants ?? []).map((apprenant) => ({
      apprenant: {
        id: apprenant.id,
        firstname: apprenant.firstname,
        lastname: apprenant.lastname,
        email: apprenant.email,
      },
      poste: posteParApprenant.get(apprenant.id) ?? null,
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
