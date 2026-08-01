import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { GoogleStrategy } from './strategies/google.strategy';
import { User } from '../users/entities/user.entity';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const jwtSecret = config.get<string>('JWT_SECRET');
        if (!jwtSecret) {
          throw new Error('JWT_SECRET must be defined');
        }
        return {
          secret: jwtSecret,
          signOptions: {
            expiresIn: config.get<string>('JWT_EXPIRES_IN', '15m') as any,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, GoogleStrategy],
  exports: [JwtModule, AuthService, TypeOrmModule],
})
export class AuthModule {}
