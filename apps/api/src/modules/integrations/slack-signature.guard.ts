import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { Request } from 'express';

/**
 * SlackSignatureGuard
 *
 * Verifies Slack's `v0=` HMAC signature for inbound webhooks (events,
 * commands, interactivity).
 *
 * Algorithm (per https://api.slack.com/authentication/verifying-requests-from-slack):
 *   sigBaseString = `v0:${timestamp}:${rawBody}`
 *   expected      = `v0=` + hex(hmacSha256(SLACK_SIGNING_SECRET, sigBaseString))
 *   compare       = timingSafeEqual(provided, expected)
 *
 * Replay protection: requests older than 5 minutes are rejected.
 *
 * Implementation choice (guard vs middleware): we use a Guard rather than a
 * Nest middleware because guards have access to the parsed `Request` object
 * AND can be cleanly attached per-handler with `@UseGuards(...)`. The raw
 * body buffer is captured upstream by the IntegrationsModule's express.raw
 * middleware (mounted on the slack endpoints in `configure()`), and the
 * guard pulls it from `req.rawBody` exactly like the existing Stripe
 * webhook flow.
 */
@Injectable()
export class SlackSignatureGuard implements CanActivate {
  private readonly logger = new Logger(SlackSignatureGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request & { rawBody?: Buffer }>();

    const secret = process.env['SLACK_SIGNING_SECRET'];
    if (!secret || secret.startsWith('PLACEHOLDER_')) {
      // Stub mode: skip verification in dev so localdev-tunnels can still
      // exercise the flow without a real Slack signing secret. In production
      // env validation guarantees a real secret (see env.config.ts).
      if (process.env['NODE_ENV'] === 'production') {
        throw new UnauthorizedException('SLACK_SIGNING_SECRET missing in production');
      }
      this.logger.warn(
        'Slack signature verification SKIPPED — SLACK_SIGNING_SECRET is a placeholder.',
      );
      return true;
    }

    const tsHeader = req.header('x-slack-request-timestamp');
    const sigHeader = req.header('x-slack-signature');
    if (!tsHeader || !sigHeader) {
      throw new UnauthorizedException('Missing Slack signature headers');
    }

    const timestamp = Number(tsHeader);
    if (!Number.isFinite(timestamp)) {
      throw new UnauthorizedException('Invalid Slack timestamp');
    }
    const ageSec = Math.abs(Date.now() / 1000 - timestamp);
    if (ageSec > 60 * 5) {
      // Replay window: 5 minutes per Slack's recommendation.
      throw new UnauthorizedException('Slack signature expired');
    }

    const raw = req.rawBody;
    if (!raw || raw.length === 0) {
      // Without a raw body the HMAC cannot match. Express raw() middleware
      // is wired in IntegrationsModule.configure(); a missing rawBody here
      // means the route was hit through a path the module didn't register.
      throw new UnauthorizedException('Missing raw body for signature');
    }

    const base = `v0:${tsHeader}:${raw.toString('utf8')}`;
    const expected = 'v0=' + createHmac('sha256', secret).update(base).digest('hex');

    const provided = Buffer.from(sigHeader);
    const expectedBuf = Buffer.from(expected);

    if (provided.length !== expectedBuf.length) {
      throw new UnauthorizedException('Slack signature length mismatch');
    }
    if (!timingSafeEqual(provided, expectedBuf)) {
      throw new UnauthorizedException('Slack signature mismatch');
    }

    return true;
  }
}
