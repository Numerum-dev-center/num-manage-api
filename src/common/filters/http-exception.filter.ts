import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status: HttpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Les exceptions HTTP de Nest (ForbiddenException, NotFoundException,
    // ValidationPipe...) exposent déjà un corps structuré via getResponse() :
    // soit une simple chaîne, soit un objet { statusCode, message, error }
    // (message pouvant lui-même être un tableau de chaînes pour les erreurs
    // de validation). On l'aplatit ici au lieu de le ré-emballer tel quel
    // sous une clé `message` : sinon le corps final devient
    // { message: { statusCode, message, error } }, et getErrorMessage() côté
    // frontend (qui ne sait lire que `message` en string ou string[])
    // n'y trouve jamais rien d'exploitable et retombe systématiquement sur
    // son message générique, quelle que soit l'erreur réelle renvoyée par
    // l'API.
    let message: string | string[] = 'Erreur interne du serveur';
    let error: string | undefined;
    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (body && typeof body === 'object') {
        const asRecord = body as Record<string, unknown>;
        message =
          typeof asRecord.message === 'string' ||
          Array.isArray(asRecord.message)
            ? (asRecord.message as string | string[])
            : exception.message;
        error = typeof asRecord.error === 'string' ? asRecord.error : undefined;
      } else {
        message = exception.message;
      }
    }

    // Sans ce log, toute exception non-HttpException (bug, erreur DB, appel
    // externe qui échoue...) est renvoyée au client mais n'apparaît nulle
    // part côté serveur - impossible à diagnostiquer en prod.
    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} -> 500: ${
          exception instanceof Error ? exception.message : String(exception)
        }`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
      ...(error ? { error } : {}),
    });
  }
}
