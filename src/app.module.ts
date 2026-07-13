import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjetsService } from './projets.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PromotionsModule } from './promotions/promotions.module';
import { MonEspaceModule } from './mon-espace/mon-espace.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get<string>('DB_USERNAME'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_DATABASE'),
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        synchronize: true,
        autoLoadEntities: true,
      }),
    }),
    AuthModule,
    UsersModule,
    PromotionsModule,
    MonEspaceModule,
  ],
  controllers: [AppController],
  providers: [AppService, ProjetsService],
})
export class AppModule {}
