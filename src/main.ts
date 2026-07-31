import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { join } from 'path';
import { Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 1. Découpage propre des URLs CORS en supprimant les espaces superflus
  const rawUrls = process.env.FRONTEND_URL || 'http://localhost:3000';
  const allowedOrigins = rawUrls
    .split(',')
    .map((url) => url.trim().replace(/\/$/, '')); // Enlève les espaces et le slash final s'il y en a

  app.enableCors({
    origin: (origin, callback) => {
      // Autorise les requêtes sans origin (comme Mobile Apps, Postman ou curl)
      if (!origin) return callback(null, true);
      
      // Nettoyage du slash final de l'origin entrante pour comparaison
      const cleanOrigin = origin.replace(/\/$/, '');
      
      if (allowedOrigins.includes(cleanOrigin)) {
        callback(null, true);
      } else {
        console.error(`[CORS Blocked] Origin not allowed: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // Documentation Swagger (Accessible sur /docs)
  const config = new DocumentBuilder()
    .setTitle('Numerum API')
    .setDescription('API du projet Numerum')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  // Pipes & Middlewares globaux
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.use(cookieParser());

  // Configuration des fichiers statiques et vues Handlebars
  app.useStaticAssets(join(__dirname, '..', 'public'));
  app.setBaseViewsDir(join(__dirname, '..', 'views'));
  app.setViewEngine('hbs');

  // Filtres et Intercepteurs globaux
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // 2. Écoute sur 0.0.0.0 (Crucial pour Render/Docker)
  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`Application lancée sur le port : ${port}`);
}
bootstrap();
