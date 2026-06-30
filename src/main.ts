import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { join } from 'path';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
    app.enableCors({
    origin: process.env.FRONTEND_URL!.split(','), // ajuste selon le port réel du frontend Next.js
    credentials: true, // pour envoyer/recevoir des cookies (refresh token httpOnly )
  });
  const config = new DocumentBuilder()
  .setTitle('Numerum API')
  .setDescription('API du projet Numerum')
  .setVersion('1.0')
  .addBearerAuth() // utile pour tester les routes protégées par JWT
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('docs', app, document);
app.useStaticAssets(join(__dirname, '..', 'public'));
  app.setBaseViewsDir(join(__dirname, '..', 'views'));
  app.setViewEngine('hbs');

  await app.listen(process.env.PORT ?? 3000);

  app.useGlobalFilters(new HttpExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,        // supprime les champs non déclarés dans le DTO
      forbidNonWhitelisted: true, // renvoie une erreur si un champ inconnu est envoyé
      transform: true,        // convertit automatiquement les types (ex: string -> number)
    }),
  );
}
bootstrap();
