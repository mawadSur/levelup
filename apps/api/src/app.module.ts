import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppLogger } from './common/logger/app-logger.service';
import { zodValidate } from './config/env.config';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './modules/prisma';
import { AuthModule } from './modules/auth';
import { OrganizationsModule } from './modules/organizations';
import { UsersModule } from './modules/users';
import { LearningModule } from './modules/learning';
import { AssessmentsModule } from './modules/assessments';
import { CoachModule } from './modules/coach';
import { PromptsModule } from './modules/prompts';
import { PoliciesModule } from './modules/policies';
import { BillingModule } from './modules/billing';
import { WebhooksModule } from './modules/webhooks';
import { ReportingModule } from './modules/reporting';
import { CertificatesModule } from './modules/certificates';
import { GameModule } from './modules/game';
import { OnboardingModule } from './modules/onboarding';
import { PrivacyModule } from './modules/privacy';
import { SearchModule } from './modules/search';
import { FlagsModule } from './modules/flags';
import { AdminOpsModule } from './modules/admin-ops';
import { PathBuilderModule } from './modules/path-builder';
import { RiskAlertsModule } from './modules/risk-alerts';
import { DemoModule } from './modules/demo';
import { AnalyticsModule } from './modules/analytics';
import { InsightsModule } from './modules/insights';
import { AnomalyModule } from './modules/anomaly';
import { IntegrationsModule } from './modules/integrations';
import { GovernanceModule } from './modules/governance';
import { LabsModule } from './modules/labs';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: zodValidate,
      cache: true,
    }),
    PrismaModule,
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
  ],
  controllers: [AppController],
  providers: [AppLogger],
  exports: [AppLogger],
})
export class AppModule {}
