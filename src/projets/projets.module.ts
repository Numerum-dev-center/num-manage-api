import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjetsService } from './projets.service';
import { SoumissionsService } from './soumissions.service';
import { AdminProjetsController } from './admin-projets.controller';
import { ProjetsController } from './projets.controller';
import { SoumissionsController } from './soumissions.controller';
import { Projet } from './entities/projet.entity';
import { Soumission } from './entities/soumission.entity';
import { ProjetPoste } from './entities/projet-poste.entity';
import { Promotion } from '../promotions/entities/promotion.entity';
import { User } from '../users/entities/user.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Projet,
      Soumission,
      ProjetPoste,
      Promotion,
      User,
    ]),
    NotificationsModule,
  ],
  controllers: [
    AdminProjetsController,
    ProjetsController,
    SoumissionsController,
  ],
  providers: [ProjetsService, SoumissionsService],
  exports: [ProjetsService, SoumissionsService],
})
export class ProjetsModule {}
