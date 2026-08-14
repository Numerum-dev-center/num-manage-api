import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RessourcesService } from './ressources.service';
import { RessourcesController } from './ressources.controller';
import { Ressource } from './entities/ressource.entity';
import { Promotion } from '../promotions/entities/promotion.entity';
import { User } from '../users/entities/user.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ressource, Promotion, User]),
    NotificationsModule,
  ],
  controllers: [RessourcesController],
  providers: [RessourcesService],
  exports: [RessourcesService],
})
export class RessourcesModule {}
