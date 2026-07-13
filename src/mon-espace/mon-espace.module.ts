import { Module } from '@nestjs/common';
import { MonEspaceController } from './mon-espace.controller';
import { PromotionsModule } from '../promotions/promotions.module';

@Module({
  imports: [PromotionsModule],
  controllers: [MonEspaceController],
})
export class MonEspaceModule {}
