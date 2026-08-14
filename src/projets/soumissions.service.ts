import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Soumission } from './entities/soumission.entity';
import { Projet } from './entities/projet.entity';
import { ProjetPoste } from './entities/projet-poste.entity';
import { User } from '../users/entities/user.entity';
import { CreateSoumissionDto } from './dto/create-soumission.dto';
import { NoterSoumissionDto } from './dto/noter-soumission.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../common/enums/notification-type.enum';
import { Role } from '../common/enums/role.enum';

@Injectable()
export class SoumissionsService {
  constructor(
    @InjectRepository(Soumission)
    private readonly soumissionRepository: Repository<Soumission>,
    @InjectRepository(Projet)
    private readonly projetRepository: Repository<Projet>,
    @InjectRepository(ProjetPoste)
    private readonly projetPosteRepository: Repository<ProjetPoste>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Règle Lead #383 : seul l'apprenant explicitement affecté au projet
   * (roster, voir ProjetPoste) peut soumettre. Une nouvelle soumission avant
   * notation remplace la précédente ; une soumission déjà notée ne peut plus
   * être modifiée.
   */
  async create(
    projetId: string,
    dto: CreateSoumissionDto,
    apprenantId: string,
  ): Promise<Soumission> {
    const projet = await this.projetRepository.findOne({
      where: { id: projetId },
    });
    if (!projet) {
      throw new NotFoundException(`Projet ${projetId} non trouvé`);
    }
    if (projet.isArchived) {
      throw new BadRequestException(
        'Ce projet est archivé, il ne peut plus recevoir de soumission',
      );
    }

    const surLeRoster = await this.projetPosteRepository.findOne({
      where: { projetId, apprenantId },
    });
    if (!surLeRoster) {
      throw new ForbiddenException("Vous n'êtes pas assigné à ce projet");
    }

    const existante = await this.soumissionRepository.findOne({
      where: { projetId, apprenantId },
    });

    if (existante) {
      if (existante.note != null) {
        throw new BadRequestException(
          'Ce projet a déjà été évalué, il ne peut plus être soumis à nouveau',
        );
      }
      existante.lienGithub = dto.lienGithub;
      existante.lienDemo = dto.lienDemo;
      existante.commentaire = dto.commentaire ?? null;
      return this.soumissionRepository.save(existante);
    }

    const soumission = this.soumissionRepository.create({
      projetId,
      apprenantId,
      lienGithub: dto.lienGithub,
      lienDemo: dto.lienDemo,
      commentaire: dto.commentaire ?? null,
    });
    try {
      return await this.soumissionRepository.save(soumission);
    } catch (err) {
      // Deux requêtes concurrentes peuvent toutes deux passer le SELECT
      // "existante" ci-dessus avant que l'une des deux n'écrive (pas de
      // verrou/transaction) : la contrainte unique (projetId, apprenantId)
      // au niveau SQL protège bien contre le doublon, mais la violation
      // (ER_DUP_ENTRY côté MySQL) remontait jusque-là comme un 500 générique
      // au lieu d'un 409 exploitable par le frontend.
      const driverCode =
        (err as { code?: string; driverError?: { code?: string } })?.driverError
          ?.code ?? (err as { code?: string })?.code;
      if (driverCode === 'ER_DUP_ENTRY') {
        throw new ConflictException(
          'Une soumission existe déjà pour ce projet — réessayez, elle vient d’être prise en compte.',
        );
      }
      throw err;
    }
  }

  async findAllForProjet(
    projetId: string,
    currentUser?: { sub: string; role: Role },
  ): Promise<Soumission[]> {
    const projet = await this.projetRepository.findOne({
      where: { id: projetId },
      relations: { promotion: true },
    });
    if (!projet) {
      throw new NotFoundException(`Projet ${projetId} non trouvé`);
    }
    this.assertFormateurGereProjet(projet, currentUser);
    return this.soumissionRepository.find({
      where: { projetId },
      relations: { apprenant: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Un FORMATEUR ne peut noter/consulter que les soumissions des projets des
   * promotions qu'il encadre (promotion.formateurId). Un SUPER_ADMIN n'est
   * jamais restreint. Sans currentUser (défaut), aucune restriction.
   */
  private assertFormateurGereProjet(
    projet: Projet,
    currentUser?: { sub: string; role: Role },
  ): void {
    if (
      currentUser?.role === Role.FORMATEUR &&
      projet.promotion?.formateurId !== currentUser.sub
    ) {
      throw new ForbiddenException(
        "Vous n'encadrez pas la promotion de ce projet",
      );
    }
  }

  /** Règle Lead #383 : seul un formateur/admin peut noter (appliqué via @Roles au niveau du contrôleur). */
  async noter(
    soumissionId: string,
    dto: NoterSoumissionDto,
    currentUser?: { sub: string; role: Role },
  ): Promise<Soumission> {
    const soumission = await this.soumissionRepository.findOne({
      where: { id: soumissionId },
      relations: { projet: { promotion: true }, apprenant: true },
    });
    if (!soumission) {
      throw new NotFoundException(`Soumission ${soumissionId} non trouvée`);
    }
    this.assertFormateurGereProjet(soumission.projet, currentUser);
    soumission.note = dto.note;
    soumission.feedback = dto.feedback ?? null;
    const saved = await this.soumissionRepository.save(soumission);

    await this.notificationsService.notify(
      soumission.apprenantId,
      NotificationType.PROJET_NOTE,
      'Projet noté',
      `Votre projet "${soumission.projet.titre}" a été noté : ${dto.note}/20`,
      '/dashboard/student/projets',
    );

    return saved;
  }
}
