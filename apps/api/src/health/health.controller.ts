import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';

type LivenessResponse = { status: 'ok' };
type ReadinessResponse = { status: 'ok' };

@ApiTags('health')
@Controller('health')
@Public()
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Liveness probe' })
  liveness(): LivenessResponse {
    return { status: 'ok' };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe' })
  readiness(): ReadinessResponse {
    return { status: 'ok' };
  }
}
