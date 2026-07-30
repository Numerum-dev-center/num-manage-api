import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { PromotionsModule } from './promotions/promotions.module';
import { StudentsModule } from './students/students.module';
import { MonEspaceModule } from './mon-espace/mon-espace.module';
import { RessourcesModule } from './ressources/ressources.module';
import { AnnoncesModule } from './annonces/annonces.module';
import { ProjetsModule } from './projets/projets.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const host = config.get<string>('DB_HOST');

        return {
          type: 'mysql',
          host: host,
          port: config.get<number>('DB_PORT'),
          username: config.get<string>('DB_USERNAME'),
          password: config.get<string>('DB_PASSWORD'),
          database: config.get<string>('DB_DATABASE'),
          autoLoadEntities: true,
          synchronize: true,
          // Support SSL obligatoire pour Aiven
          ssl: host?.includes('aivencloud.com')
            ? { rejectUnauthorized: false }
            : false,
        };
      },
    }),
    AuthModule,
    UsersModule,
    PromotionsModule,
    StudentsModule,
    MonEspaceModule,
    RessourcesModule,
    AnnoncesModule,
    ProjetsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
