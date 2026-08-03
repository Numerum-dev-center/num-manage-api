import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProjetsService, ProjetPourApprenant } from './projets.service';
import { SoumissionsService } from './soumissions.service';
import { CreateSoumissionDto } from './dto/create-soumission.dto';
import { SetPosteDto } from './dto/set-poste.dto';
import { Soumission } from './entities/soumission.entity';
import { ProjetPoste } from './entities/projet-poste.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('projets')
@Controller('projets')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.APPRENANT)
@ApiBearerAuth()
export class ProjetsController {
  constructor(
    private readonly projetsService: ProjetsService,
    private readonly soumissionsService: SoumissionsService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      "Lister les projets de la promotion de l'apprenant connecté, avec son statut d'avancement (#394)",
  })
  async findMine(
    @CurrentUser() currentUser: { sub: string },
  ): Promise<ProjetPourApprenant[]> {
    return this.projetsService.findMine(currentUser.sub);
  }

  @Get(':id/soumettre')
  @ApiOperation({
    summary: 'Détails du projet et de sa propre soumission éventuelle (#395)',
  })
  async getForSoumettre(
    @Param('id') id: string,
    @CurrentUser() currentUser: { sub: string },
  ): Promise<ProjetPourApprenant> {
    return this.projetsService.getForSoumettre(id, currentUser.sub);
  }

  @Post(':id/soumettre')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Soumettre (ou remplacer) son travail pour ce projet (#389)',
  })
  async soumettre(
    @Param('id') id: string,
    @Body() dto: CreateSoumissionDto,
    @CurrentUser() currentUser: { sub: string },
  ): Promise<Soumission> {
    return this.soumissionsService.create(id, dto, currentUser.sub);
  }

  @Patch(':id/poste')
  @ApiOperation({
    summary: 'Choisir (ou changer) son propre poste sur ce projet',
  })
  async setMaPoste(
    @Param('id') id: string,
    @Body() dto: SetPosteDto,
    @CurrentUser() currentUser: { sub: string },
  ): Promise<ProjetPoste> {
    return this.projetsService.setPoste(id, currentUser.sub, dto.poste);
  }
}
