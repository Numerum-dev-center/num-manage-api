import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PromotionsService } from '../promotions/promotions.service';
import { Promotion } from '../promotions/entities/promotion.entity';
import { User } from '../users/entities/user.entity';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { RessourcesService } from '../ressources/ressources.service';
import { Ressource } from '../ressources/entities/ressource.entity';
import { AnnoncesService } from '../annonces/annonces.service';
import { Annonce } from '../annonces/entities/annonce.entity';

@ApiTags('mon-espace')
@Controller('mon-espace')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.APPRENANT)
@ApiBearerAuth()
export class MonEspaceController {
  constructor(
    private readonly promotionsService: PromotionsService,
    private readonly ressourcesService: RessourcesService,
    private readonly annoncesService: AnnoncesService,
  ) {}

  @Get('ma-promotion')
  @ApiOperation({ summary: 'Récupérer sa promotion et ses camarades' })
  async getMaPromotion(
    @CurrentUser() currentUser: any,
  ): Promise<{ promotion: Promotion | null; camarades: User[] }> {
    return this.promotionsService.findMyPromotion(currentUser.sub);
  }

  @Get('ressources')
  @ApiOperation({
    summary: 'Lister les ressources de la promotion de l’apprenant connecté',
  })
  async getRessources(@CurrentUser() currentUser: any): Promise<Ressource[]> {
    return this.ressourcesService.findMine(currentUser.sub);
  }

  @Get('annonces')
  @ApiOperation({
    summary: 'Lister les annonces de la promotion de l’apprenant connecté',
  })
  async getAnnonces(@CurrentUser() currentUser: any): Promise<Annonce[]> {
    return this.annoncesService.findMine(currentUser.sub);
  }
}
