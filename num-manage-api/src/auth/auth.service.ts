import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class AuthService {
  private googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

  constructor(private jwtService: JwtService) {}

  async validateGoogleToken(token: string) {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();

      if (!payload) throw new UnauthorizedException('Token Google invalide');

      return {
        email: payload.email,
        nom: payload.family_name,
        prenom: payload.given_name,
        googleId: payload.sub,
      };
    } catch {
      throw new UnauthorizedException('Token Google invalide');
    }
  }

  generateJwt(user: { id: string; email: string; role: string }) {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
  }
}