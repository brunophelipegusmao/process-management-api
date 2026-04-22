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
  createDeadlineSchema,
  type CreateDeadlineInput,
  deadlineFiltersSchema,
  type UpdateDeadlineInput,
  updateDeadlineSchema,
} from '../../schema/zod';
import { DeadlinesService } from './deadlines.service';

const deadlineIdParamSchema = z.object({
  id: z.string().uuid(),
});

class DeadlineIdParamDto extends createZodDto(deadlineIdParamSchema) {}
class CreateDeadlineBodyDto extends createZodDto(createDeadlineSchema) {}
class UpdateDeadlineBodyDto extends createZodDto(updateDeadlineSchema) {}
class DeadlineFiltersQueryDto extends createZodDto(deadlineFiltersSchema) {}

@ApiTags('deadlines')
@ApiBearerAuth()
@Roles('superadmin', 'advogado', 'paralegal')
@Controller('deadlines')
export class DeadlinesController {
  constructor(private readonly deadlinesService: DeadlinesService) {}

  @ApiOperation({ summary: 'Lista prazos com filtros opcionais' })
  @ApiOkResponse({ description: 'Lista de prazos retornada com sucesso.' })
  @ApiUnauthorizedResponse({ description: 'Sessao ausente ou invalida.' })
  @Get()
  async findMany(@Query() query: DeadlineFiltersQueryDto) {
    const result = await this.deadlinesService.findMany(query);

    return {
      data: result.items,
      meta: result.meta,
    };
  }

  @ApiOperation({ summary: 'Recupera um prazo pelo identificador' })
  @ApiOkResponse({ description: 'Prazo encontrado.' })
  @ApiUnauthorizedResponse({ description: 'Sessao ausente ou invalida.' })
  @ApiBadRequestResponse({ description: 'ID invalido.' })
  @ApiNotFoundResponse({ description: 'Prazo nao encontrado.' })
  @Get(':id')
  findById(@Param() params: DeadlineIdParamDto) {
    return this.deadlinesService.findById(params.id);
  }

  @ApiOperation({ summary: 'Cria um prazo calculando a data automaticamente' })
  @ApiCreatedResponse({ description: 'Prazo criado com sucesso.' })
  @ApiUnauthorizedResponse({ description: 'Sessao ausente ou invalida.' })
  @ApiBadRequestResponse({ description: 'Payload invalido.' })
  @ApiNotFoundResponse({ description: 'Processo ou testemunha nao encontrado.' })
  @ApiUnprocessableEntityResponse({ description: 'Testemunha substituida nao pode receber novo prazo.' })
  @Post()
  create(@Body() body: CreateDeadlineBodyDto) {
    return this.deadlinesService.create(body as CreateDeadlineInput);
  }

  @ApiOperation({ summary: 'Atualiza um prazo existente' })
  @ApiOkResponse({ description: 'Prazo atualizado com sucesso.' })
  @ApiUnauthorizedResponse({ description: 'Sessao ausente ou invalida.' })
  @ApiBadRequestResponse({ description: 'Payload ou ID invalido.' })
  @ApiNotFoundResponse({ description: 'Prazo nao encontrado.' })
  @Patch(':id')
  update(
    @Param() params: DeadlineIdParamDto,
    @Body() body: UpdateDeadlineBodyDto,
  ) {
    return this.deadlinesService.update(params.id, body as UpdateDeadlineInput);
  }

  @ApiOperation({ summary: 'Cancela um prazo existente' })
  @ApiOkResponse({ description: 'Prazo cancelado com sucesso.' })
  @ApiUnauthorizedResponse({ description: 'Sessao ausente ou invalida.' })
  @ApiBadRequestResponse({ description: 'ID invalido.' })
  @ApiNotFoundResponse({ description: 'Prazo nao encontrado.' })
  @Delete(':id')
  remove(@Param() params: DeadlineIdParamDto) {
    return this.deadlinesService.remove(params.id);
  }
}
