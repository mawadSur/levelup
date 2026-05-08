import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SessionPayload } from '@levelup/auth-client';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { DepartmentsService } from './departments.service';
import { createDepartmentSchema } from './dto/create-department.dto';
import type { CreateDepartmentDto } from './dto/create-department.dto';

@Controller('departments')
@UseGuards(AuthGuard, RoleGuard)
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  listDepartments(@CurrentUser() user: SessionPayload) {
    return this.departmentsService.listDepartments(user);
  }

  @Post()
  @Roles('MANAGER')
  createDepartment(
    @CurrentUser() user: SessionPayload,
    @Body(new ZodValidationPipe(createDepartmentSchema)) dto: CreateDepartmentDto,
  ) {
    return this.departmentsService.createDepartment(user, dto);
  }

  @Patch(':id')
  @Roles('MANAGER')
  updateDepartment(
    @CurrentUser() user: SessionPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(createDepartmentSchema)) dto: CreateDepartmentDto,
  ) {
    return this.departmentsService.updateDepartment(user, id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  deleteDepartment(@CurrentUser() user: SessionPayload, @Param('id') id: string) {
    return this.departmentsService.deleteDepartment(user, id);
  }
}
