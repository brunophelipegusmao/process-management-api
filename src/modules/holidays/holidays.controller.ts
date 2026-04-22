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
} from '@nestjs/swagger';
import { z } from 'zod';

import { Roles } from '../../common/decorators/roles.decorator';
import { createZodDto } from '../../common/pipes/create-zod-dto';
import {
  createHolidaySchema,
  type CreateHolidayInput,
  holidayFiltersSchema,
  type UpdateHolidayInput,
  updateHolidaySchema,
} from '../../schema/zod';
import { HolidaysService } from './holidays.service';

const holidayIdParamSchema = z.object({
  id: z.string().uuid(),
});

class HolidayIdParamDto extends createZodDto(holidayIdParamSchema) {}
class CreateHolidayBodyDto extends createZodDto(createHolidaySchema) {}
class UpdateHolidayBodyDto extends createZodDto(updateHolidaySchema) {}
class HolidayFiltersQueryDto extends createZodDto(holidayFiltersSchema) {}

@ApiTags('holidays')
@ApiBearerAuth()
@Roles('superadmin', 'advogado', 'paralegal')
@Controller('holidays')
export class HolidaysController {
  constructor(private readonly holidaysService: HolidaysService) {}

  @ApiOperation({ summary: 'Lista feriados com filtros opcionais' })
  @ApiOkResponse({ description: 'Lista de feriados retornada com sucesso.' })
  @ApiUnauthorizedResponse({ description: 'Sessao ausente ou invalida.' })
  @Get()
  async findMany(@Query() query: HolidayFiltersQueryDto) {
    const result = await this.holidaysService.findMany(query);

    return {
      data: result.items,
      meta: result.meta,
    };
  }

  @ApiOperation({ summary: 'Recupera um feriado pelo identificador' })
  @ApiOkResponse({ description: 'Feriado encontrado.' })
  @ApiUnauthorizedResponse({ description: 'Sessao ausente ou invalida.' })
  @ApiBadRequestResponse({ description: 'ID invalido.' })
  @ApiNotFoundResponse({ description: 'Feriado nao encontrado.' })
  @Get(':id')
  findById(@Param() params: HolidayIdParamDto) {
    return this.holidaysService.findById(params.id);
  }

  @ApiOperation({ summary: 'Cria ou consolida um feriado' })
  @ApiCreatedResponse({ description: 'Feriado criado com sucesso.' })
  @ApiUnauthorizedResponse({ description: 'Sessao ausente ou invalida.' })
  @ApiBadRequestResponse({ description: 'Payload invalido.' })
  @Post()
  create(@Body() body: CreateHolidayBodyDto) {
    return this.holidaysService.create(body as CreateHolidayInput);
  }

  @ApiOperation({ summary: 'Atualiza um feriado existente' })
  @ApiOkResponse({ description: 'Feriado atualizado com sucesso.' })
  @ApiUnauthorizedResponse({ description: 'Sessao ausente ou invalida.' })
  @ApiBadRequestResponse({ description: 'Payload ou ID invalido.' })
  @ApiNotFoundResponse({ description: 'Feriado nao encontrado.' })
  @Patch(':id')
  update(
    @Param() params: HolidayIdParamDto,
    @Body() body: UpdateHolidayBodyDto,
  ) {
    return this.holidaysService.update(params.id, body as UpdateHolidayInput);
  }

  @ApiOperation({ summary: 'Remove um feriado' })
  @ApiOkResponse({ description: 'Feriado removido com sucesso.' })
  @ApiUnauthorizedResponse({ description: 'Sessao ausente ou invalida.' })
  @ApiBadRequestResponse({ description: 'ID invalido.' })
  @ApiNotFoundResponse({ description: 'Feriado nao encontrado.' })
  @Delete(':id')
  remove(@Param() params: HolidayIdParamDto) {
    return this.holidaysService.remove(params.id);
  }
}
