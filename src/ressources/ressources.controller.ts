import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
import type { Response } from 'express';
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

@ApiTags('ressources')
@Controller('ressources')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RessourcesController {
  constructor(private readonly ressourcesService: RessourcesService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.FORMATEUR)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file', ressourcesMulterOptions))
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
