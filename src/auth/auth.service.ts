import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { Role } from '../common/enums/role.enum';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleProfile } from './strategies/google.strategy';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto, res: Response) {
    const existing = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });
    if (existing) {
      throw new ConflictException('Cet email est déjà utilisé');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const user = this.userRepository.create({
      ...registerDto,
      password: hashedPassword,
      role: Role.APPRENANT,
    });
    const savedUser = await this.userRepository.save(user);

    const accessToken = this.generateAccessToken(savedUser);
    const refreshToken = this.generateRefreshToken(savedUser);
    this.setRefreshTokenCookie(res, refreshToken);

    return {
      accessToken,
      user: {
        id: savedUser.id,
        email: savedUser.email,
        firstname: savedUser.firstname,
        lastname: savedUser.lastname,
        role: savedUser.role,
      },
    };
  }

  async login(loginDto: LoginDto, res: Response) {
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
    });
    if (!user || !user.password) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    if (user.isDeleted || !user.isActive) {
      throw new UnauthorizedException('Compte inactif ou supprimé');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);
    this.setRefreshTokenCookie(res, refreshToken);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstname: user.firstname,
        lastname: user.lastname,
        role: user.role,
      },
    };
  }

  private generateAccessToken(user: User): string {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return this.jwtService.sign(payload);
  }

  private generateRefreshToken(user: User): string {
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
    if (!refreshSecret) {
      throw new Error('JWT_REFRESH_SECRET must be defined');
    }
    const payload = { sub: user.id, tv: user.refreshTokenVersion };
    return this.jwtService.sign(payload, {
      secret: refreshSecret,
      expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ??
        '7d') as any,
    });
  }

  // Frontend et API sont sur des origines différentes (Vercel / Render, ou
  // localhost:3000 / localhost:3001 en dev) : SameSite=Strict ne serait
  // jamais envoyé sur ces requêtes cross-site, cassant /auth/refresh. None
  // exige Secure, ce que les navigateurs acceptent aussi sur localhost en HTTP.
  private static readonly REFRESH_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: true,
    sameSite: 'none' as const,
  };

  setRefreshTokenCookie(res: Response, refreshToken: string): void {
    res.cookie('refreshToken', refreshToken, {
      ...AuthService.REFRESH_COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours en ms
    });
  }
  async refresh(req: any, res: Response) {
    const token = req.cookies?.refreshToken;
    if (!token) {
      throw new UnauthorizedException('Refresh token manquant');
    }

    try {
      const refreshSecret =
        this.configService.get<string>('JWT_REFRESH_SECRET');
      if (!refreshSecret) {
        throw new UnauthorizedException('Refresh secret non défini');
      }

      const payload = this.jwtService.verify(token, {
        secret: refreshSecret,
      });
      const user = await this.userRepository.findOne({
        where: { id: payload.sub, isDeleted: false, isActive: true },
      });
      if (!user) throw new UnauthorizedException('Utilisateur introuvable');

      // Un logout() incrémente refreshTokenVersion : un refresh token émis
      // avant cette déconnexion porte encore l'ancienne version et est donc
      // rejeté ici, même s'il n'a pas expiré — sans ça, un refresh token
      // intercepté avant logout continuait de fonctionner indéfiniment après
      // la déconnexion.
      if (payload.tv !== user.refreshTokenVersion) {
        throw new UnauthorizedException('Refresh token révoqué');
      }

      const accessToken = this.generateAccessToken(user);
      return { accessToken };
    } catch {
      throw new UnauthorizedException('Refresh token invalide ou expiré');
    }
  }

  async logout(userId: string, res: Response): Promise<void> {
    await this.userRepository.increment(
      { id: userId },
      'refreshTokenVersion',
      1,
    );
    res.clearCookie('refreshToken', AuthService.REFRESH_COOKIE_OPTIONS);
  }

  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId, isDeleted: false, isActive: true },
    });
    if (!user) {
      throw new UnauthorizedException('Utilisateur introuvable');
    }
    return user;
  }

  async loginWithGoogle(
    googleProfile: GoogleProfile,
    res: Response,
  ): Promise<void> {
    let user = await this.userRepository.findOne({
      where: { googleId: googleProfile.googleId },
    });

    if (!user) {
      user = await this.userRepository.findOne({
        where: { email: googleProfile.email },
      });
    }

    if (!user) {
      user = this.userRepository.create({
        email: googleProfile.email,
        firstname: googleProfile.firstname,
        lastname: googleProfile.lastname,
        googleId: googleProfile.googleId,
        password: null,
        role: Role.APPRENANT,
      });
      user = await this.userRepository.save(user);
    } else if (user.googleId !== googleProfile.googleId) {
      user.googleId = googleProfile.googleId;
      user = await this.userRepository.save(user);
    }

    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);
    this.setRefreshTokenCookie(res, refreshToken);

    const frontendUrl = this.configService
      .get<string>('FRONTEND_URL')
      ?.split(',')[0];
    if (!frontendUrl) {
      throw new UnauthorizedException('Frontend URL non configurée');
    }
    const redirectUrl = new URL('/auth/google/callback', frontendUrl);
    res.redirect(redirectUrl.toString());
  }
}
