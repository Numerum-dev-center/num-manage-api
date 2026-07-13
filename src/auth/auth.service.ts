import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
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
    const payload = { sub: user.id };
    return this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET!,
      expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN! ?? '7d') as any,
    });
  }

  setRefreshTokenCookie(res: Response, refreshToken: string): void {
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours en ms
    });
  }
  async refresh(req: any, res: Response) {
    const token = req.cookies?.refreshToken;
    if (!token) {
      throw new UnauthorizedException('Refresh token manquant');
    }

    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });
      if (!user) throw new UnauthorizedException('Utilisateur introuvable');

      const accessToken = this.generateAccessToken(user);
      return { accessToken };
    } catch {
      throw new UnauthorizedException('Refresh token invalide ou expiré');
    }
  }

  logout(res: Response): void {
    res.clearCookie('refreshToken');
  }

  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
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

    const frontendUrl = process.env.FRONTEND_URL!.split(',')[0];
    const redirectUrl = new URL('/auth/google/callback', frontendUrl);
    redirectUrl.searchParams.set('token', accessToken);
    res.redirect(redirectUrl.toString());
  }
}
