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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
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
  @Get(':id')
  findById(@Param() params: HearingIdParamDto) {
    return this.hearingsService.findById(params.id);
  }

  @ApiOperation({ summary: 'Cria uma audiencia para um processo' })
  @Post()
  create(@Body() body: CreateHearingBodyDto) {
    return this.hearingsService.create(body as CreateHearingInput);
  }

  @ApiOperation({ summary: 'Atualiza dados gerais de uma audiencia' })
  @Patch(':id')
  update(
    @Param() params: HearingIdParamDto,
    @Body() body: UpdateHearingBodyDto,
  ) {
    return this.hearingsService.update(params.id, body as UpdateHearingInput);
  }

  @ApiOperation({ summary: 'Registra a redesignacao de uma audiencia' })
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
  @Delete(':id')
  remove(@Param() params: HearingIdParamDto) {
    return this.hearingsService.cancel(params.id);
  }
}
