import { Module } from '@nestjs/common';
import { MonEspaceController } from './mon-espace.controller';
import { PromotionsModule } from '../promotions/promotions.module';
import { RessourcesModule } from '../ressources/ressources.module';

@Module({
  imports: [PromotionsModule, RessourcesModule],
  controllers: [MonEspaceController],
})
export class MonEspaceModule {}
