import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';

type RootResponse = {
  service: string;
  version: string;
  time: string;
};

@ApiTags('root')
@Controller()
export class AppController {
  @Public()
  @Get()
  @ApiOperation({ summary: 'Service info' })
  root(): RootResponse {
    return {
      service: 'levelup-api',
      version: process.env['npm_package_version'] ?? '0.1.0',
      time: new Date().toISOString(),
    };
  }
}
