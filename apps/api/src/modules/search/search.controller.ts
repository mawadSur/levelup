/**
 * SearchController — CR.22
 *
 * GET /search?q=&limit=
 *
 * Returns semantic (or text-fallback) search results over lessons and prompts.
 * Authentication is required (AuthGuard). No roles restriction — any learner
 * can search. No audit logging for reads.
 */

import { Controller, Get, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SessionPayload } from '@levelup/auth-client';
import { SearchService } from './search.service';
import type { SearchResponse } from '@levelup/types';

const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 200;

@Controller('search')
@UseGuards(AuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /**
   * GET /search?q=cold+email&limit=10
   *
   * - query must be 2–200 characters
   * - Empty / too short query → empty result set (not an error)
   * - limit defaults to 10, max 25
   */
  @Get()
  async search(
    @CurrentUser() user: SessionPayload,
    @Query('q') query?: string,
    @Query('limit') limit?: string,
  ): Promise<SearchResponse> {
    const q = (query ?? '').trim();

    if (q.length > MAX_QUERY_LENGTH) {
      throw new BadRequestException(`Query must be at most ${MAX_QUERY_LENGTH} characters`);
    }

    if (q.length < MIN_QUERY_LENGTH) {
      return { hits: [], query: q };
    }

    const parsedLimit = limit ? parseInt(limit, 10) : undefined;

    const { hits, stub } = await this.searchService.searchLessons({
      query: q,
      organizationId: user.organizationId,
      userId: user.userId,
      limit: parsedLimit,
    });

    return { hits, query: q, ...(stub ? { stub: true } : {}) };
  }
}
