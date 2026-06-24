import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = new DocumentBuilder()
  .setTitle('Numerum API')
  .setDescription('API du projet Numerum')
  .setVersion('1.0')
  .addBearerAuth() // utile pour tester les routes protégées par JWT
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('docs', app, document);
  await app.listen(process.env.PORT ?? 3000);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,        // supprime les champs non déclarés dans le DTO
      forbidNonWhitelisted: true, // renvoie une erreur si un champ inconnu est envoyé
      transform: true,        // convertit automatiquement les types (ex: string -> number)
    }),
  );
}
bootstrap();
