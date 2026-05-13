import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SessionPayload } from '@levelup/auth-client';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { PoliciesService } from './policies.service';
import { publishPolicySchema } from './dto/update-policy.dto';
import { PublishPolicyDto } from './dto/update-policy.dto';

@Controller('policies')
@UseGuards(AuthGuard, RoleGuard)
export class PoliciesController {
  constructor(private readonly policiesService: PoliciesService) {}

  /**
   * GET /policies/current
   * Any authenticated user. Returns the latest CompanyPolicy for the org.
   * 404 with { error: { code: 'NO_POLICY' } } when none exists.
   *
   * IMPORTANT: this route is declared before `:version` so NestJS does not
   * attempt to parse the literal "current" as an integer.
   */
  @Get('current')
  getCurrentPolicy(@CurrentUser() user: SessionPayload) {
    return this.policiesService.getCurrentPolicy(user);
  }

  /**
   * GET /policies
   * ADMIN or MANAGER. All versions for the org, newest first.
   */
  @Get()
  @Roles('MANAGER')
  listPolicies(@CurrentUser() user: SessionPayload) {
    return this.policiesService.listPolicies(user);
  }

  /**
   * GET /policies/:version
   * ADMIN or MANAGER. Specific version.
   */
  @Get(':version')
  @Roles('MANAGER')
  getPolicyByVersion(
    @CurrentUser() user: SessionPayload,
    @Param('version', ParseIntPipe) version: number,
  ) {
    return this.policiesService.getPolicyByVersion(user, version);
  }

  /**
   * POST /policies
   * ADMIN only. Publishes a new version (max+1 or 1).
   * Cannot edit past versions — only roll forward.
   */
  @Post()
  @Roles('ADMIN')
  @HttpCode(201)
  publishPolicy(
    @CurrentUser() user: SessionPayload,
    @Body(new ZodValidationPipe(publishPolicySchema)) dto: PublishPolicyDto,
  ) {
    return this.policiesService.publishPolicy(user, dto);
  }

  /**
   * DELETE /policies/:version
   * ADMIN only. Hard-deletes the specified version row.
   * See PoliciesService.deleteVersion for rationale.
   */
  @Delete(':version')
  @Roles('ADMIN')
  deleteVersion(
    @CurrentUser() user: SessionPayload,
    @Param('version', ParseIntPipe) version: number,
  ) {
    return this.policiesService.deleteVersion(user, version);
  }
}
