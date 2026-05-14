import { Module } from '@nestjs/common';
import { BenchmarksController, BenchmarkOptOutController } from './benchmarks.controller';
import { BenchmarksService } from './benchmarks.service';

@Module({
  controllers: [BenchmarksController, BenchmarkOptOutController],
  providers: [BenchmarksService],
  exports: [BenchmarksService],
})
export class BenchmarksModule {}
