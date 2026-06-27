import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { CreateAuthDto } from './dto/create-auth.dto';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  async register(createAuthDto: CreateAuthDto) {
    // 1. Vérifier si l'email existe déjà
    // (on le fera quand la base de données sera connectée)

    // 2. Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(createAuthDto.password, 10);

    // 3. Créer l'utilisateur (on le fera avec le repository)
    const user = {
      ...createAuthDto,
      password: hashedPassword,
    };

    // 4. Générer et retourner le JWT
    return this.generateJwt({ id: '1', email: user.email, role: 'APPRENANT' });
  }

  async login(email: string, password: string) {
    // 1. Trouver l'utilisateur (on le fera avec le repository)
    // 2. Vérifier le mot de passe
    // 3. Générer le JWT
    throw new UnauthorizedException('Non implémenté');
  }

  generateJwt(user: { id: string; email: string; role: string }) {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
  }
}