import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppLogger } from './common/logger/app-logger.service';
import { zodValidate } from './config/env.config';
import { PrismaModule } from './modules/prisma';
import { ALL_MODULES } from './modules';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: zodValidate,
      cache: true,
    }),
    // Foundational module — kept here (not in ALL_MODULES) to document its
    // role as bedrock. Every feature module that needs the DB depends on
    // PrismaService transitively via Nest's DI graph.
    PrismaModule,
    // Every feature module lives in `apps/api/src/modules/index.ts`. To add
    // a new module, edit that registry — no changes here are required.
    ...ALL_MODULES,
  ],
  controllers: [AppController],
  providers: [AppLogger],
  exports: [AppLogger],
})
export class AppModule {}
