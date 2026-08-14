import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AnnoncesService } from './annonces.service';
import { CreateAnnonceDto } from './dto/create-annonce.dto';
import { Annonce } from './entities/annonce.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('annonces')
@Controller('annonces')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.FORMATEUR)
@ApiBearerAuth()
export class AnnoncesController {
  constructor(private readonly annoncesService: AnnoncesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Publier une annonce ciblée sur une promotion' })
  async create(
    @Body() dto: CreateAnnonceDto,
    @CurrentUser() currentUser: { sub: string; role: Role },
  ): Promise<Annonce> {
    return this.annoncesService.create(dto, currentUser);
  }

  @Get()
  @ApiOperation({
    summary: 'Lister les annonces (filtrable par promotion)',
  })
  async findAll(
    @Query('promotionId') promotionId?: string,
  ): Promise<Annonce[]> {
    return this.annoncesService.findAllForManager(promotionId);
  }
}
