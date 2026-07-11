import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PromotionsService } from './promotions.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('promotions')
@ApiBearerAuth()
@Controller('admin/promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.FORMATEUR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer une promotion' })
  create(@Body() createPromotionDto: CreatePromotionDto) {
    return this.promotionsService.create(createPromotionDto);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.FORMATEUR)
  @ApiOperation({ summary: 'Lister toutes les promotions' })
  findAll() {
    return this.promotionsService.findAll();
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.FORMATEUR)
  @ApiOperation({ summary: 'Récupérer une promotion' })
  findOne(@Param('id') id: string) {
    return this.promotionsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.FORMATEUR)
  @ApiOperation({ summary: 'Modifier une promotion' })
  update(@Param('id') id: string, @Body() updatePromotionDto: UpdatePromotionDto) {
    return this.promotionsService.update(id, updatePromotionDto);
  }

  @Patch(':id/archive')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Archiver une promotion' })
  archive(@Param('id') id: string) {
    return this.promotionsService.archive(id);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer une promotion' })
  remove(@Param('id') id: string) {
    return this.promotionsService.remove(id);
  }
}