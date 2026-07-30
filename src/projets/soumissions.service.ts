import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Soumission } from './entities/soumission.entity';
import { Projet } from './entities/projet.entity';
import { User } from '../users/entities/user.entity';
import { CreateSoumissionDto } from './dto/create-soumission.dto';
import { NoterSoumissionDto } from './dto/noter-soumission.dto';

@Injectable()
export class SoumissionsService {
  constructor(
    @InjectRepository(Soumission)
    private readonly soumissionRepository: Repository<Soumission>,
    @InjectRepository(Projet)
    private readonly projetRepository: Repository<Projet>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Règle Lead #383 : seul l'apprenant appartenant à la promotion du projet
   * peut soumettre. Une nouvelle soumission avant notation remplace la
   * précédente ; une soumission déjà notée ne peut plus être modifiée.
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

    const apprenant = await this.userRepository.findOne({
      where: { id: apprenantId, isDeleted: false },
    });
    if (!apprenant || apprenant.promotionId !== projet.promotionId) {
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
    return this.soumissionRepository.save(soumission);
  }

  async findAllForProjet(projetId: string): Promise<Soumission[]> {
    const projet = await this.projetRepository.findOne({
      where: { id: projetId },
    });
    if (!projet) {
      throw new NotFoundException(`Projet ${projetId} non trouvé`);
    }
    return this.soumissionRepository.find({
      where: { projetId },
      relations: { apprenant: true },
      order: { createdAt: 'DESC' },
    });
  }

  /** Règle Lead #383 : seul un formateur/admin peut noter (appliqué via @Roles au niveau du contrôleur). */
  async noter(
    soumissionId: string,
    dto: NoterSoumissionDto,
  ): Promise<Soumission> {
    const soumission = await this.soumissionRepository.findOne({
      where: { id: soumissionId },
      relations: { projet: true, apprenant: true },
    });
    if (!soumission) {
      throw new NotFoundException(`Soumission ${soumissionId} non trouvée`);
    }
    soumission.note = dto.note;
    soumission.feedback = dto.feedback ?? null;
    return this.soumissionRepository.save(soumission);
  }
}
