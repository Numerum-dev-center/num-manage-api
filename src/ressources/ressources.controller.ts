import {
  BadRequestException,
  Body,
  CallHandler,
  Controller,
  Delete,
  ExecutionContext,
  Get,
  HttpCode,
  HttpStatus,
  Injectable,
  NestInterceptor,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { promises as fsPromises } from 'fs';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { RessourcesService } from './ressources.service';
import { ressourcesMulterOptions } from './ressources.multer-options';
import { CreateRessourceDto } from './dto/create-ressource.dto';
import { Ressource } from './entities/ressource.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';
import { RessourceType } from './enums/ressource-type.enum';

/**
 * Supprime le fichier déjà écrit sur disque par FileInterceptor (Multer)
 * lorsque le reste de la requête échoue APRÈS l'upload physique : validation
 * du DTO (ValidationPipe, ex. promotionId invalide) ou vérification manuelle
 * du contrôleur (fichier + url fournis simultanément). Sans cela, ces échecs
 * laissent un fichier orphelin dans uploads/ressources/ (jamais référencé en
 * base, jamais nettoyé) — voir RessourcesService.create() qui gère déjà le
 * nettoyage pour le cas "promotion introuvable".
 */
@Injectable()
class CleanupUploadOnErrorInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      catchError((err: unknown) => {
        const req = context
          .switchToHttp()
          .getRequest<Request & { file?: Express.Multer.File }>();
        if (req.file?.path) {
          fsPromises.unlink(req.file.path).catch(() => undefined);
        }
        return throwError(() => err as Error);
      }),
    );
  }
}

@ApiTags('ressources')
@Controller('ressources')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RessourcesController {
  constructor(private readonly ressourcesService: RessourcesService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.FORMATEUR)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', ressourcesMulterOptions),
    CleanupUploadOnErrorInterceptor,
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary:
      'Téléverser une ressource pédagogique : fichier (PDF/ZIP, 10 Mo max) ou lien externe',
  })
  async create(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: CreateRessourceDto,
    @CurrentUser() currentUser: { sub: string },
  ): Promise<Ressource> {
    if (!file && !dto.url) {
      throw new BadRequestException('Fournissez un fichier ou un lien');
    }
    if (file && dto.url) {
      throw new BadRequestException(
        'Fournissez soit un fichier, soit un lien, pas les deux',
      );
    }
    return this.ressourcesService.create(file, dto, currentUser.sub);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.FORMATEUR)
  @ApiOperation({
    summary: 'Lister les ressources (filtrable par promotion et par type)',
  })
  async findAll(
    @Query('promotionId') promotionId?: string,
    @Query('type') type?: string,
  ): Promise<Ressource[]> {
    const validTypes: string[] = Object.values(RessourceType);
    const parsedType = validTypes.includes(type ?? '')
      ? (type as RessourceType)
      : undefined;
    return this.ressourcesService.findAllForManager(promotionId, parsedType);
  }

  @Get(':id/telecharger')
  @Roles(Role.SUPER_ADMIN, Role.FORMATEUR, Role.APPRENANT)
  @ApiOperation({ summary: 'Télécharger une ressource' })
  async download(
    @Param('id') id: string,
    @CurrentUser() currentUser: { sub: string; role: Role },
    @Res() res: Response,
  ): Promise<void> {
    const ressource = await this.ressourcesService.getForDownload(
      id,
      currentUser,
    );
    if (ressource.type === RessourceType.LIEN) {
      res.redirect(ressource.url!);
      return;
    }
    res.download(ressource.storedPath!, ressource.filename!);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.FORMATEUR)
  @ApiOperation({ summary: 'Supprimer une ressource' })
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    await this.ressourcesService.remove(id);
    return { success: true };
  }
}
