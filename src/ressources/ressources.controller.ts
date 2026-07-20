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
    summary: 'Téléverser une ressource pédagogique (PDF ou ZIP, 10 Mo max)',
  })
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateRessourceDto,
    @CurrentUser() currentUser: { sub: string },
  ): Promise<Ressource> {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }
    return this.ressourcesService.create(file, dto, currentUser.sub);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.FORMATEUR)
  @ApiOperation({
    summary: 'Lister les ressources (filtrable par promotion)',
  })
  async findAll(
    @Query('promotionId') promotionId?: string,
  ): Promise<Ressource[]> {
    return this.ressourcesService.findAllForManager(promotionId);
  }

  @Get('me')
  @Roles(Role.APPRENANT)
  @ApiOperation({
    summary: 'Lister les ressources de la promotion de l’apprenant connecté',
  })
  async findMine(
    @CurrentUser() currentUser: { sub: string },
  ): Promise<Ressource[]> {
    return this.ressourcesService.findMine(currentUser.sub);
  }

  @Get(':id/download')
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
