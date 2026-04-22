import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { Roles } from '../../common/decorators/roles.decorator';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@Roles('superadmin', 'advogado')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @ApiOperation({ summary: 'Indicadores agregados do sistema' })
  @ApiOkResponse({ description: 'Visao geral retornada com sucesso.' })
  @ApiUnauthorizedResponse({ description: 'Sessao ausente ou invalida.' })
  @Get('overview')
  async getOverview() {
    return this.reportsService.getOverview();
  }

  @ApiOperation({ summary: 'Contagem de prazos agrupada por status' })
  @ApiOkResponse({ description: 'Contagens retornadas com sucesso.' })
  @ApiUnauthorizedResponse({ description: 'Sessao ausente ou invalida.' })
  @Get('deadlines-by-status')
  async getDeadlinesByStatus() {
    return { data: await this.reportsService.getDeadlinesByStatus() };
  }

  @ApiOperation({ summary: 'Contagem de testemunhas agrupada por status' })
  @ApiOkResponse({ description: 'Contagens retornadas com sucesso.' })
  @ApiUnauthorizedResponse({ description: 'Sessao ausente ou invalida.' })
  @Get('witnesses-by-status')
  async getWitnessesByStatus() {
    return { data: await this.reportsService.getWitnessesByStatus() };
  }

  @ApiOperation({ summary: 'Audiencias agendadas nos proximos 30 dias' })
  @ApiOkResponse({ description: 'Lista de audiencias retornada com sucesso.' })
  @ApiUnauthorizedResponse({ description: 'Sessao ausente ou invalida.' })
  @Get('upcoming-hearings')
  async getUpcomingHearings() {
    return { data: await this.reportsService.getUpcomingHearings() };
  }
}

