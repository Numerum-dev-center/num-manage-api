import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import { join } from 'path';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AVATARS_UPLOAD_DIR } from './avatar.multer-options';
import { Promotion } from '../promotions/entities/promotion.entity';
import { Role } from '../common/enums/role.enum';

export interface CurrentUserPayload {
  sub: string;
  role: Role;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Récupère le repository Promotion via l'EntityManager partagé plutôt que
   * par injection directe : évite d'ajouter une dépendance au constructeur
   * (et donc de casser les tests existants qui instancient UsersService avec
   * uniquement le repository User mocké).
   */
  private getPromotionRepository(): Repository<Promotion> {
    return this.userRepository.manager.getRepository(Promotion);
  }

  /**
   * Un FORMATEUR ne doit voir que les utilisateurs de ses propres
   * promotions (+ lui-même), jamais les apprenants/formateurs des autres
   * promotions. Seul le SUPER_ADMIN a une vue complète.
   */
  private async findAllForFormateur(formateurId: string): Promise<User[]> {
    const managedPromotions = await this.getPromotionRepository().find({
      where: { formateurId },
      select: { id: true },
    });
    const promotionIds = managedPromotions.map((promotion) => promotion.id);

    const where: FindOptionsWhere<User>[] = [
      { isDeleted: false, id: formateurId },
    ];
    if (promotionIds.length > 0) {
      where.push({ isDeleted: false, promotionId: In(promotionIds) });
    }

    return this.userRepository.find({
      where,
      relations: { promotion: true },
    });
  }

  private async assertVisibleToFormateur(
    user: User,
    formateurId: string,
  ): Promise<void> {
    if (user.id === formateurId) {
      return;
    }
    const promotion = user.promotionId
      ? await this.getPromotionRepository().findOne({
          where: { id: user.promotionId, formateurId },
        })
      : null;
    if (!promotion) {
      // Même erreur que "non trouvé" : on ne confirme pas l'existence d'un
      // utilisateur hors du périmètre du formateur.
      throw new NotFoundException(`Utilisateur ${user.id} non trouvé`);
    }
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Vérifier si l'email existe déjà
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });
    if (existingUser) {
      throw new ConflictException(
        `L'email ${createUserDto.email} est déjà utilisé`,
      );
    }

    // Hasher le password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });
    return this.userRepository.save(user);
  }

  async findAll(currentUser?: CurrentUserPayload): Promise<User[]> {
    if (currentUser && currentUser.role !== Role.SUPER_ADMIN) {
      return this.findAllForFormateur(currentUser.sub);
    }
    return this.userRepository.find({
      where: { isDeleted: false },
      relations: { promotion: true },
    });
  }

  async findOne(id: string, currentUser?: CurrentUserPayload): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id, isDeleted: false },
      relations: { promotion: true },
    });
    if (!user) {
      throw new NotFoundException(`Utilisateur ${id} non trouvé`);
    }
    if (currentUser && currentUser.role !== Role.SUPER_ADMIN) {
      await this.assertVisibleToFormateur(user, currentUser.sub);
    }
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateUserDto.email },
      });
      if (existingUser) {
        throw new ConflictException(
          `L'email ${updateUserDto.email} est déjà utilisé`,
        );
      }
    }
    Object.assign(user, updateUserDto);
    return this.userRepository.save(user);
  }

  async setAvatar(id: string, file: Express.Multer.File): Promise<User> {
    const user = await this.findOne(id);

    // Supprime l'ancien avatar sur disque pour ne pas accumuler de fichiers
    // orphelins à chaque changement de photo.
    if (user.avatarUrl) {
      const previousFilename = user.avatarUrl.split('/').pop();
      if (previousFilename) {
        await fs.promises
          .unlink(join(AVATARS_UPLOAD_DIR, previousFilename))
          .catch(() => undefined);
      }
    }

    user.avatarUrl = `/avatars/${file.filename}`;
    return this.userRepository.save(user);
  }

  async softDelete(id: string): Promise<void> {
    const user = await this.findOne(id);
    user.isDeleted = true;
    await this.userRepository.save(user);
  }

  async toggleActive(id: string): Promise<User> {
    const user = await this.findOne(id);
    user.isActive = !user.isActive;
    return this.userRepository.save(user);
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    if (!user.password) {
      return false;
    }
    return bcrypt.compare(password, user.password);
  }
}
