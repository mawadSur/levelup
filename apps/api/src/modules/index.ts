/**
 * Module registry — single source of truth for the NestJS feature modules
 * registered on `AppModule`.
 *
 * To add a new feature module:
 *   1. Create `apps/api/src/modules/<name>/` with a NestJS `*Module` class
 *      and a barrel `index.ts` that re-exports the module.
 *   2. Import the module below.
 *   3. Append it to `ALL_MODULES`.
 *
 * `AppModule` consumes `ALL_MODULES` directly — no edits needed there.
 *
 * Notes
 * - `PrismaModule` is intentionally NOT in this list. It's a foundational
 *   module that `AppModule` mounts first (it's already `@Global()` but the
 *   explicit ordering documents its role as bedrock).
 * - `AuthModule` is included here. It's `@Global()` and registers the
 *   `APP_GUARD` providers (AuthGuard + RoleGuard) that protect every route.
 *   Position in the array does not affect guard ordering — Nest resolves
 *   `APP_GUARD` providers in declaration order inside `AuthModule` itself.
 * - The order below mirrors the historical order in `app.module.ts` so this
 *   refactor is a no-op at runtime. If you find you need a specific ordering
 *   for side effects, document the reason inline.
 */

import type { Type } from '@nestjs/common';

import { AuthModule } from './auth';
import { HealthModule } from '../health/health.module';
import { OrganizationsModule } from './organizations';
import { UsersModule } from './users';
import { LearningModule } from './learning';
import { AssessmentsModule } from './assessments';
import { RiskAlertsModule } from './risk-alerts';
import { CoachModule } from './coach';
import { PromptsModule } from './prompts';
import { PoliciesModule } from './policies';
import { BillingModule } from './billing';
import { WebhooksModule } from './webhooks';
import { ReportingModule } from './reporting';
import { CertificatesModule } from './certificates';
import { GameModule } from './game';
import { LabsModule } from './labs';
import { IncidentsModule } from './incidents';
import { SkillsModule } from './skills';
import { NudgesModule } from './nudges';
import { BenchmarksModule } from './benchmarks';
import { StudyPlanModule } from './study-plan';
import { OnboardingModule } from './onboarding';
import { PrivacyModule } from './privacy';
import { SearchModule } from './search';
import { FlagsModule } from './flags';
import { AdminOpsModule } from './admin-ops';
import { PathBuilderModule } from './path-builder';
import { DemoModule } from './demo';
import { AnalyticsModule } from './analytics';
import { InsightsModule } from './insights';
import { AnomalyModule } from './anomaly';
import { IntegrationsModule } from './integrations';
import { GovernanceModule } from './governance';

export const ALL_MODULES: Type<unknown>[] = [
  AuthModule,
  HealthModule,
  OrganizationsModule,
  UsersModule,
  LearningModule,
  AssessmentsModule,
  RiskAlertsModule,
  CoachModule,
  PromptsModule,
  PoliciesModule,
  BillingModule,
  WebhooksModule,
  ReportingModule,
  CertificatesModule,
  GameModule,
  LabsModule,
  IncidentsModule,
  SkillsModule,
  NudgesModule,
  BenchmarksModule,
  StudyPlanModule,
  OnboardingModule,
  PrivacyModule,
  SearchModule,
  FlagsModule,
  AdminOpsModule,
  PathBuilderModule,
  DemoModule,
  AnalyticsModule,
  InsightsModule,
  AnomalyModule,
  IntegrationsModule,
  GovernanceModule,
];
