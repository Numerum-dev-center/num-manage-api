import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProjetsService, ProjetAvecStats } from './projets.service';
import { SoumissionsService } from './soumissions.service';
import { CreateProjetDto } from './dto/create-projet.dto';
import { Projet } from './entities/projet.entity';
import { Soumission } from './entities/soumission.entity';
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

  @Get(':id/soumissions')
  @ApiOperation({ summary: "Lister les soumissions d'un projet (#390)" })
  async findSoumissions(@Param('id') id: string): Promise<Soumission[]> {
    return this.soumissionsService.findAllForProjet(id);
  }
}
