import { Body, Controller, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SoumissionsService } from './soumissions.service';
import { NoterSoumissionDto } from './dto/noter-soumission.dto';
import { Soumission } from './entities/soumission.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('projets')
@Controller('soumissions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.FORMATEUR)
@ApiBearerAuth()
export class SoumissionsController {
  constructor(private readonly soumissionsService: SoumissionsService) {}

  @Patch(':id')
  @ApiOperation({ summary: 'Noter une soumission : note + feedback (#391)' })
  async noter(
    @Param('id') id: string,
    @Body() dto: NoterSoumissionDto,
    @CurrentUser() currentUser: { sub: string; role: Role },
  ): Promise<Soumission> {
    return this.soumissionsService.noter(id, dto, currentUser);
  }
}
