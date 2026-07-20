import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import { Ressource } from './entities/ressource.entity';
import { Promotion } from '../promotions/entities/promotion.entity';
import { User } from '../users/entities/user.entity';
import { Role } from '../common/enums/role.enum';
import { CreateRessourceDto } from './dto/create-ressource.dto';

export interface CurrentUserPayload {
  sub: string;
  role: Role;
}

@Injectable()
export class RessourcesService {
  constructor(
    @InjectRepository(Ressource)
    private readonly ressourceRepository: Repository<Ressource>,
    @InjectRepository(Promotion)
    private readonly promotionRepository: Repository<Promotion>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(
    file: Express.Multer.File,
    dto: CreateRessourceDto,
    uploadedById: string,
  ): Promise<Ressource> {
    const promotion = await this.promotionRepository.findOne({
      where: { id: dto.promotionId },
    });
    if (!promotion) {
      await fs.promises.unlink(file.path).catch(() => undefined);
      throw new NotFoundException(`Promotion ${dto.promotionId} non trouvée`);
    }

    const ressource = this.ressourceRepository.create({
      title: dto.title?.trim() || file.originalname,
      filename: file.originalname,
      storedPath: file.path,
      mimeType: file.mimetype,
      size: file.size,
      promotionId: dto.promotionId,
      uploadedById,
    });
    return this.ressourceRepository.save(ressource);
  }

  async findAllForManager(promotionId?: string): Promise<Ressource[]> {
    return this.ressourceRepository.find({
      where: promotionId ? { promotionId } : {},
      relations: { promotion: true, uploadedBy: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findMine(userId: string): Promise<Ressource[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId, isDeleted: false },
    });
    if (!user) {
      throw new NotFoundException(`Utilisateur ${userId} non trouvé`);
    }
    if (!user.promotionId) {
      return [];
    }
    return this.ressourceRepository.find({
      where: { promotionId: user.promotionId },
      relations: { uploadedBy: true },
      order: { createdAt: 'DESC' },
    });
  }

  async getForDownload(
    id: string,
    currentUser: CurrentUserPayload,
  ): Promise<Ressource> {
    const ressource = await this.ressourceRepository.findOne({
      where: { id },
    });
    if (!ressource) {
      throw new NotFoundException(`Ressource ${id} non trouvée`);
    }

    if (currentUser.role === Role.APPRENANT) {
      const user = await this.userRepository.findOne({
        where: { id: currentUser.sub, isDeleted: false },
      });
      if (!user?.promotionId || user.promotionId !== ressource.promotionId) {
        throw new ForbiddenException("Vous n'avez pas accès à cette ressource");
      }
    }

    return ressource;
  }

  async remove(id: string): Promise<void> {
    const ressource = await this.ressourceRepository.findOne({
      where: { id },
    });
    if (!ressource) {
      throw new NotFoundException(`Ressource ${id} non trouvée`);
    }
    await this.ressourceRepository.remove(ressource);
    await fs.promises.unlink(ressource.storedPath).catch(() => undefined);
  }
}
