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
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PromotionsService } from './promotions.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { AssignApprenantsDto } from './dto/assign-apprenants.dto';
import { Promotion } from './entities/promotion.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('promotions')
@Controller('promotions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.FORMATEUR)
@ApiBearerAuth()
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer une nouvelle promotion' })
  async create(
    @Body() createPromotionDto: CreatePromotionDto,
  ): Promise<Promotion> {
    return this.promotionsService.create(createPromotionDto);
  }

  @Get()
  @ApiOperation({ summary: 'Récupérer toutes les promotions' })
  async findAll(
    @Query('includeArchived') includeArchived?: string,
  ): Promise<Promotion[]> {
    return this.promotionsService.findAll(includeArchived === 'true');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer une promotion par ID' })
  async findOne(@Param('id') id: string): Promise<Promotion> {
    return this.promotionsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour une promotion' })
  async update(
    @Param('id') id: string,
    @Body() updatePromotionDto: UpdatePromotionDto,
  ): Promise<Promotion> {
    return this.promotionsService.update(id, updatePromotionDto);
  }

  @Patch(':id/archive')
  @ApiOperation({ summary: 'Archiver une promotion' })
  async archive(@Param('id') id: string): Promise<Promotion> {
    return this.promotionsService.archive(id);
  }

  @Patch(':id/apprenants')
  @ApiOperation({ summary: 'Affecter des apprenants à une promotion' })
  async assignApprenants(
    @Param('id') id: string,
    @Body() assignApprenantsDto: AssignApprenantsDto,
  ): Promise<Promotion> {
    return this.promotionsService.assignApprenants(id, assignApprenantsDto);
  }

  @Delete(':id/apprenants/:userId')
  @ApiOperation({ summary: 'Retirer un apprenant d’une promotion' })
  async removeApprenant(
    @Param('id') id: string,
    @Param('userId') userId: string,
  ): Promise<Promotion> {
    return this.promotionsService.removeApprenant(id, userId);
  }
}
