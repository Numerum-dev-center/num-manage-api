import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('students')
@ApiBearerAuth()
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.FORMATEUR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer un apprenant' })
  create(@Body() createStudentDto: CreateStudentDto) {
    return this.studentsService.create(createStudentDto);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.FORMATEUR)
  @ApiOperation({ summary: 'Lister tous les apprenants' })
  findAll() {
    return this.studentsService.findAll();
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.FORMATEUR)
  @ApiOperation({ summary: 'Récupérer un apprenant' })
  findOne(@Param('id') id: string) {
    return this.studentsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.FORMATEUR)
  @ApiOperation({ summary: 'Modifier un apprenant' })
  update(@Param('id') id: string, @Body() updateStudentDto: UpdateStudentDto) {
    return this.studentsService.update(id, updateStudentDto);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un apprenant' })
  remove(@Param('id') id: string) {
    return this.studentsService.remove(id);
  }
}