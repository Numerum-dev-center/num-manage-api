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
        // Le certificat est stocké avec des \n littéraux dans les variables
        // d'environnement mono-ligne (Render, .env) ; on les reconvertit en
        // vrais retours à la ligne pour obtenir un PEM valide.
        const caCert = config.get<string>('DB_CA_CERT')?.replace(/\\n/g, '\n');

        return {
          type: 'mysql',
          host: host,
          port: config.get<number>('DB_PORT'),
          username: config.get<string>('DB_USERNAME'),
          password: config.get<string>('DB_PASSWORD'),
          database: config.get<string>('DB_DATABASE'),
          autoLoadEntities: true,
          synchronize: true,
          // Aiven exige TLS. On valide le certificat serveur avec la CA du
          // projet plutôt que de désactiver la vérification (rejectUnauthorized:
          // false rendait la connexion vulnérable à une interception/MITM).
          ssl: host?.includes('aivencloud.com')
            ? { ca: caCert, rejectUnauthorized: true }
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
