import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ProjetsService,
  ProjetAvecStats,
  ApprenantAvecPoste,
} from './projets.service';
import { SoumissionsService } from './soumissions.service';
import { CreateProjetDto } from './dto/create-projet.dto';
import { SetPosteDto } from './dto/set-poste.dto';
import { Projet } from './entities/projet.entity';
import { Soumission } from './entities/soumission.entity';
import { ProjetPoste } from './entities/projet-poste.entity';
import { User } from '../users/entities/user.entity';
import { Promotion } from '../promotions/entities/promotion.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('projets')
@Controller('admin/projets')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.FORMATEUR)
@ApiBearerAuth()
export class AdminProjetsController {
  constructor(
    private readonly projetsService: ProjetsService,
    private readonly soumissionsService: SoumissionsService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      'Lister tous les projets avec statut agrégé et alerte de retard (#387)',
  })
  async findAll(): Promise<ProjetAvecStats[]> {
    return this.projetsService.findAllForManager();
  }

  @Get('creer')
  @ApiOperation({
    summary: 'Options du formulaire de création (formateurs, promotions)',
  })
  async getFormOptions(): Promise<{
    formateurs: Pick<User, 'id' | 'firstname' | 'lastname'>[];
    promotions: Pick<Promotion, 'id' | 'name'>[];
  }> {
    return this.projetsService.getFormOptions();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer un nouveau projet (#388)' })
  async create(
    @Body() dto: CreateProjetDto,
    @CurrentUser() currentUser: { sub: string },
  ): Promise<Projet> {
    return this.projetsService.create(dto, currentUser.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détails d’un projet avec statut agrégé' })
  async findOne(@Param('id') id: string): Promise<ProjetAvecStats> {
    return this.projetsService.findOneForManager(id);
  }

  @Get(':id/soumissions')
  @ApiOperation({ summary: "Lister les soumissions d'un projet (#390)" })
  async findSoumissions(@Param('id') id: string): Promise<Soumission[]> {
    return this.soumissionsService.findAllForProjet(id);
  }

  @Get(':id/postes')
  @ApiOperation({
    summary: 'Lister le roster (apprenants affectés + poste éventuel) de ce projet',
  })
  async findPostes(@Param('id') id: string): Promise<ApprenantAvecPoste[]> {
    return this.projetsService.findPostesForProjet(id);
  }

  @Get(':id/apprenants-disponibles')
  @ApiOperation({
    summary:
      "Lister les apprenants de la promotion pas encore affectés à ce projet",
  })
  async findApprenantsDisponibles(
    @Param('id') id: string,
  ): Promise<Pick<User, 'id' | 'firstname' | 'lastname' | 'email'>[]> {
    return this.projetsService.findApprenantsDisponibles(id);
  }

  @Post(':id/apprenants/:apprenantId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Affecter explicitement un apprenant à ce projet' })
  async addApprenant(
    @Param('id') id: string,
    @Param('apprenantId') apprenantId: string,
  ): Promise<ProjetPoste> {
    return this.projetsService.addApprenant(id, apprenantId);
  }

  @Delete(':id/apprenants/:apprenantId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Retirer un apprenant de ce projet' })
  async removeApprenant(
    @Param('id') id: string,
    @Param('apprenantId') apprenantId: string,
  ): Promise<void> {
    return this.projetsService.removeApprenantFromProjet(id, apprenantId);
  }

  @Patch(':id/postes/:apprenantId')
  @ApiOperation({
    summary: "Changer le poste d'un apprenant déjà affecté à ce projet",
  })
  async setPoste(
    @Param('id') id: string,
    @Param('apprenantId') apprenantId: string,
    @Body() dto: SetPosteDto,
  ): Promise<ProjetPoste> {
    return this.projetsService.setPoste(id, apprenantId, dto.poste);
  }
}
