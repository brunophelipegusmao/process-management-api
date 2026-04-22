import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { z } from 'zod';

import { Roles } from '../../common/decorators/roles.decorator';
import { createZodDto } from '../../common/pipes/create-zod-dto';
import {
  createHearingSchema,
  type CreateHearingInput,
  hearingFiltersSchema,
  type HearingFiltersInput,
  type UpdateHearingInput,
  updateHearingSchema,
} from '../../schema/zod';
import { HearingsService } from './hearings.service';

const hearingIdParamSchema = z.object({
  id: z.string().uuid(),
});

const rescheduleHearingSchema = z.object({
  dateTime: z.coerce.date(),
});

class HearingIdParamDto extends createZodDto(hearingIdParamSchema) {}
class CreateHearingBodyDto extends createZodDto(createHearingSchema) {}
class UpdateHearingBodyDto extends createZodDto(updateHearingSchema) {}
class HearingFiltersQueryDto extends createZodDto(hearingFiltersSchema) {}
class RescheduleHearingBodyDto extends createZodDto(rescheduleHearingSchema) {}

@ApiTags('hearings')
@ApiBearerAuth()
@Roles('superadmin', 'advogado', 'paralegal')
@Controller('hearings')
export class HearingsController {
  constructor(private readonly hearingsService: HearingsService) {}

  @ApiOperation({ summary: 'Lista audiencias com filtros opcionais' })
  @ApiOkResponse({ description: 'Lista de audiencias retornada com sucesso.' })
  @ApiUnauthorizedResponse({ description: 'Sessao ausente ou invalida.' })
  @Get()
  async findMany(@Query() query: HearingFiltersQueryDto) {
    const result = await this.hearingsService.findMany(
      query as HearingFiltersInput,
    );

    return {
      data: result.items,
      meta: result.meta,
    };
  }

  @ApiOperation({ summary: 'Recupera uma audiencia pelo identificador' })
  @ApiOkResponse({ description: 'Audiencia encontrada.' })
  @ApiUnauthorizedResponse({ description: 'Sessao ausente ou invalida.' })
  @ApiBadRequestResponse({ description: 'ID invalido.' })
  @ApiNotFoundResponse({ description: 'Audiencia nao encontrada.' })
  @Get(':id')
  findById(@Param() params: HearingIdParamDto) {
    return this.hearingsService.findById(params.id);
  }

  @ApiOperation({ summary: 'Cria uma audiencia para um processo' })
  @ApiCreatedResponse({ description: 'Audiencia criada com sucesso.' })
  @ApiUnauthorizedResponse({ description: 'Sessao ausente ou invalida.' })
  @ApiBadRequestResponse({ description: 'Payload invalido.' })
  @ApiNotFoundResponse({ description: 'Processo nao encontrado.' })
  @Post()
  create(@Body() body: CreateHearingBodyDto) {
    return this.hearingsService.create(body as CreateHearingInput);
  }

  @ApiOperation({ summary: 'Atualiza dados gerais de uma audiencia' })
  @ApiOkResponse({ description: 'Audiencia atualizada com sucesso.' })
  @ApiUnauthorizedResponse({ description: 'Sessao ausente ou invalida.' })
  @ApiBadRequestResponse({ description: 'Payload ou ID invalido.' })
  @ApiNotFoundResponse({ description: 'Audiencia nao encontrada.' })
  @Patch(':id')
  update(
    @Param() params: HearingIdParamDto,
    @Body() body: UpdateHearingBodyDto,
  ) {
    return this.hearingsService.update(params.id, body as UpdateHearingInput);
  }

  @ApiOperation({ summary: 'Registra a redesignacao de uma audiencia' })
  @ApiCreatedResponse({ description: 'Audiencia redesignada e novos prazos gerados.' })
  @ApiUnauthorizedResponse({ description: 'Sessao ausente ou invalida.' })
  @ApiBadRequestResponse({ description: 'Payload ou ID invalido.' })
  @ApiNotFoundResponse({ description: 'Audiencia nao encontrada.' })
  @ApiUnprocessableEntityResponse({ description: 'Audiencia ja cancelada nao pode ser redesignada.' })
  @Post(':id/reschedule')
  reschedule(
    @Param() params: HearingIdParamDto,
    @Body() body: RescheduleHearingBodyDto,
  ) {
    return this.hearingsService.reschedule(params.id, {
      dateTime: body.dateTime,
    });
  }

  @ApiOperation({ summary: 'Cancela uma audiencia e os prazos vinculados' })
  @ApiOkResponse({ description: 'Audiencia cancelada e prazos vinculados cancelados.' })
  @ApiUnauthorizedResponse({ description: 'Sessao ausente ou invalida.' })
  @ApiBadRequestResponse({ description: 'ID invalido.' })
  @ApiNotFoundResponse({ description: 'Audiencia nao encontrada.' })
  @Delete(':id')
  remove(@Param() params: HearingIdParamDto) {
    return this.hearingsService.cancel(params.id);
  }
}
