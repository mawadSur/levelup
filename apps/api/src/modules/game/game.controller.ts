import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { SessionPayload } from '@levelup/auth-client';
import type {
  DailyQuests,
  GameState,
  Leaderboard,
  LeaderboardPeriod,
  LeaderboardScope,
} from '@levelup/types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { PrismaService } from '../prisma';
import type { GameService } from './game.service';
import { type ClaimQuestDto, claimQuestSchema } from './dto/claim-quest.dto';

const VALID_SCOPES: ReadonlySet<LeaderboardScope> = new Set(['org', 'department', 'me']);
const VALID_PERIODS: ReadonlySet<LeaderboardPeriod> = new Set(['week', 'month', 'all']);

@ApiTags('game')
@Controller('game')
export class GameController {
  constructor(
    private readonly game: GameService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('state')
  async getState(@CurrentUser() user: SessionPayload): Promise<GameState> {
    return this.game.getGameState(user.userId);
  }

  /**
   * Today's three daily quests for the current user. We hit `users` once to
   * resolve role + jobTitle so the quest generator can pick role-flavoured
   * templates. The role on SessionPayload is always present and authoritative
   * but the jobTitle isn't on the session, so we look it up.
   */
  @Get('quests/today')
  async getTodayQuests(@CurrentUser() user: SessionPayload): Promise<DailyQuests> {
    const profile = await this.prisma.user.findUnique({
      where: { id: user.userId },
      select: { jobTitle: true },
    });
    return this.game.getDailyQuests(
      user.userId,
      user.organizationId,
      user.role,
      profile?.jobTitle ?? null,
    );
  }

  @Post('quests/claim')
  async claim(
    @CurrentUser() user: SessionPayload,
    @Body(new ZodValidationPipe(claimQuestSchema)) body: ClaimQuestDto,
  ): Promise<{ awarded: number }> {
    return this.game.claimQuest(user.userId, user.organizationId, body.slug);
  }

  @Get('leaderboard')
  async leaderboard(
    @CurrentUser() user: SessionPayload,
    @Query('scope') scope: string = 'org',
    @Query('period') period: string = 'week',
    @Query('departmentId') departmentId?: string,
  ): Promise<Leaderboard> {
    if (!VALID_SCOPES.has(scope as LeaderboardScope)) {
      throw new BadRequestException(
        `Invalid scope. Expected one of: ${Array.from(VALID_SCOPES).join(', ')}`,
      );
    }
    if (!VALID_PERIODS.has(period as LeaderboardPeriod)) {
      throw new BadRequestException(
        `Invalid period. Expected one of: ${Array.from(VALID_PERIODS).join(', ')}`,
      );
    }

    // Optional cross-org-leak guard: if a departmentId is provided, ensure it
    // belongs to the requester's org. Otherwise an attacker could enumerate
    // other orgs' department leaderboards by guessing IDs.
    if (departmentId) {
      const dept = await this.prisma.department.findUnique({
        where: { id: departmentId },
        select: { organizationId: true },
      });
      if (!dept || dept.organizationId !== user.organizationId) {
        throw new NotFoundException('Department not found');
      }
    }

    return this.game.getLeaderboard({
      organizationId: user.organizationId,
      scope: scope as LeaderboardScope,
      period: period as LeaderboardPeriod,
      ...(departmentId ? { departmentId } : {}),
      userId: user.userId,
    });
  }
}
