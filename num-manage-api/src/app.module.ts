import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { UsersModule } from './users/users.module';
import { ProjetsService } from './projets.service';


@Module({
  imports: [UsersModule],
  controllers: [AppController],
  providers: [AppService, ProjetsService],
})
export class AppModule {}
