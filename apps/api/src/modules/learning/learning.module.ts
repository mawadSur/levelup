import { Module } from '@nestjs/common';
import { PathsController } from './paths/paths.controller';
import { PathsService } from './paths/paths.service';
import { LessonsController } from './lessons/lessons.controller';
import { LessonsService } from './lessons/lessons.service';
import { QuizzesController } from './quizzes/quizzes.controller';
import { QuizzesService } from './quizzes/quizzes.service';
import { ProgressController } from './progress/progress.controller';
import { ProgressService } from './progress/progress.service';

@Module({
  controllers: [PathsController, LessonsController, QuizzesController, ProgressController],
  providers: [PathsService, LessonsService, QuizzesService, ProgressService],
  exports: [PathsService, LessonsService, QuizzesService, ProgressService],
})
export class LearningModule {}
