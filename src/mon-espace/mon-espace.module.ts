import { Module } from '@nestjs/common';
import { MonEspaceController } from './mon-espace.controller';
import { PromotionsModule } from '../promotions/promotions.module';
import { RessourcesModule } from '../ressources/ressources.module';
import { AnnoncesModule } from '../annonces/annonces.module';

@Module({
  imports: [PromotionsModule, RessourcesModule, AnnoncesModule],
  controllers: [MonEspaceController],
})
export class MonEspaceModule {}
