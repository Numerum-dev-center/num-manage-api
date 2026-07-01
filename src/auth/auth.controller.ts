import { Controller, Post, Body, HttpCode, HttpStatus,  Get, UseGuards, Res, Req } from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer un compte (email/mot de passe)' })
  async register(@Body() registerDto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    return this.authService.register(registerDto, res);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Se connecter et obtenir un token JWT' })
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.authService.login(loginDto, res);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Obtenir le profil de l’utilisateur connecté' })
  async getProfile(@CurrentUser() user: any) {
    return user;
  }
  @Post('refresh')
@HttpCode(HttpStatus.OK)
@ApiOperation({ summary: 'Rafraîchir l\'accessToken via le cookie refreshToken' })
async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
  return this.authService.refresh(req, res);
}

@Post('logout')
@HttpCode(HttpStatus.OK)
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiOperation({ summary: 'Déconnexion' })
logout(@Res({ passthrough: true }) res: Response) {
  this.authService.logout(res);
  return { message: 'Déconnecté avec succès' };
}
}