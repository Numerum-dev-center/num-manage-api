import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import {
  Strategy,
  StrategyOptions,
  VerifyCallback,
} from 'passport-google-oauth20';

export interface GoogleProfile {
  googleId: string;
  email: string;
  firstname: string;
  lastname: string;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    const options: StrategyOptions = {
      clientID: process.env.GOOGLE_CLIENT_ID || 'not-configured',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'not-configured',
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL ||
        'http://localhost:3001/auth/google/callback',
      scope: ['email', 'profile'],
    };
    super(options);
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: import('passport-google-oauth20').Profile,
    done: VerifyCallback,
  ): void {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      done(new Error('Aucun email fourni par Google'), false);
      return;
    }
    const googleUser: GoogleProfile = {
      googleId: profile.id,
      email,
      firstname:
        profile.name?.givenName ?? profile.displayName ?? 'Utilisateur',
      lastname: profile.name?.familyName ?? '',
    };
    done(null, googleUser);
  }
}
