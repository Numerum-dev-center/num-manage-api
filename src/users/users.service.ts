import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import { join } from 'path';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AVATARS_UPLOAD_DIR } from './avatar.multer-options';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

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

  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      where: { isDeleted: false },
      relations: { promotion: true },
    });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id, isDeleted: false },
      relations: { promotion: true },
    });
    if (!user) {
      throw new NotFoundException(`Utilisateur ${id} non trouvé`);
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
