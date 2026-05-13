import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { RoleGuard } from '../../auth/guards/role.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { SessionPayload } from '@levelup/auth-client';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { PathsService } from './paths.service';
import { createLearningPathSchema } from './dto/create-path.dto';
import { CreatePathDto } from './dto/create-path.dto';
import { updatePathSchema } from './dto/update-path.dto';
import { UpdatePathDto } from './dto/update-path.dto';
import { assignPathSchema } from './dto/assign-path.dto';
import { AssignPathDto } from './dto/assign-path.dto';
import { saveBulkSchema } from './dto/save-bulk.dto';
import { SaveBulkDto } from './dto/save-bulk.dto';

@Controller('paths')
@UseGuards(RoleGuard)
export class PathsController {
  constructor(private readonly pathsService: PathsService) {}

  @Get()
  listPaths(@CurrentUser() user: SessionPayload) {
    return this.pathsService.listPaths(user);
  }

  /**
   * GET /paths/curriculum-map
   *
   * Returns the full path catalog grouped by tier (Apprentice → Practitioner
   * → Specialist → Hero) with the current user's progress overlay and
   * prerequisite lock state. Declared before the `:slug` route so Nest
   * doesn't match "curriculum-map" as a slug — if you reorder these handlers
   * the literal-string route MUST stay above the param route or every call to
   * /paths/curriculum-map starts hitting getPathBySlug with slug="curriculum-map"
   * and returning 404 "Learning path not found".
   */
  @Get('curriculum-map')
  getCurriculumMap(@CurrentUser() user: SessionPayload) {
    return this.pathsService.getCurriculumMap(user);
  }

  @Get(':slug')
  getPathBySlug(@Param('slug') slug: string, @CurrentUser() user: SessionPayload) {
    return this.pathsService.getPathBySlug(slug, user);
  }

  @Post()
  @Roles('MANAGER')
  createPath(
    @CurrentUser() user: SessionPayload,
    @Body(new ZodValidationPipe(createLearningPathSchema)) dto: CreatePathDto,
  ) {
    return this.pathsService.createPath(user, dto);
  }

  @Patch(':id')
  @Roles('MANAGER')
  updatePath(
    @Param('id') id: string,
    @CurrentUser() user: SessionPayload,
    @Body(new ZodValidationPipe(updatePathSchema)) dto: UpdatePathDto,
  ) {
    return this.pathsService.updatePath(id, user, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  deletePath(@Param('id') id: string, @CurrentUser() user: SessionPayload) {
    return this.pathsService.deletePath(id, user);
  }

  @Post(':id/assign')
  @Roles('MANAGER')
  assignUsers(
    @Param('id') id: string,
    @CurrentUser() user: SessionPayload,
    @Body(new ZodValidationPipe(assignPathSchema)) dto: AssignPathDto,
  ) {
    return this.pathsService.assignUsers(id, user, dto);
  }

  @Post(':id/unassign')
  @Roles('MANAGER')
  unassignUsers(
    @Param('id') id: string,
    @CurrentUser() user: SessionPayload,
    @Body(new ZodValidationPipe(assignPathSchema)) dto: AssignPathDto,
  ) {
    return this.pathsService.unassignUsers(id, user, dto);
  }

  @Get(':id/learners')
  @Roles('MANAGER')
  getPathLearners(@Param('id') id: string, @CurrentUser() user: SessionPayload) {
    return this.pathsService.getPathLearners(id, user);
  }

  /** POST /paths/:id/save-bulk — manual path editor bulk-save endpoint. */
  @Post(':id/save-bulk')
  @Roles('MANAGER')
  saveBulk(
    @Param('id') id: string,
    @CurrentUser() user: SessionPayload,
    @Body(new ZodValidationPipe(saveBulkSchema)) dto: SaveBulkDto,
  ) {
    return this.pathsService.saveBulk(id, user, dto);
  }
}
