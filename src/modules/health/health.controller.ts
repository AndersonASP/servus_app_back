import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  @ApiOperation({ summary: 'Verifica se a API está online' })
  @ApiResponse({ status: 200, description: 'API está respondendo' })
  check() {
    return { status: 'ok', timestamp: new Date() };
  }
}
