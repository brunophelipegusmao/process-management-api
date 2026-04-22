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
  ApiConflictResponse,
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
  createWitnessSchema,
  type CreateWitnessInput,
  replaceWitnessSchema,
  type ReplaceWitnessInput,
  type UpdateWitnessInput,
  updateWitnessSchema,
  type WitnessIntimationOutcomeRequestInput,
  type WitnessIntimationRequestInput,
  witnessIntimationOutcomeRequestSchema,
  witnessIntimationRequestSchema,
  witnessFiltersSchema,
} from '../../schema/zod';
import { WitnessesService } from './witnesses.service';

const witnessIdParamSchema = z.object({
  id: z.string().uuid(),
});

class WitnessIdParamDto extends createZodDto(witnessIdParamSchema) {}
class CreateWitnessBodyDto extends createZodDto(createWitnessSchema) {}
class UpdateWitnessBodyDto extends createZodDto(updateWitnessSchema) {}
class ReplaceWitnessBodyDto extends createZodDto(replaceWitnessSchema) {}
class WitnessIntimationRequestBodyDto extends createZodDto(
  witnessIntimationRequestSchema,
) {}
class WitnessIntimationOutcomeRequestBodyDto extends createZodDto(
  witnessIntimationOutcomeRequestSchema,
) {}
class WitnessFiltersQueryDto extends createZodDto(witnessFiltersSchema) {}

@ApiTags('witnesses')
@ApiBearerAuth()
@Roles('superadmin', 'advogado', 'paralegal')
@Controller('witnesses')
export class WitnessesController {
  constructor(private readonly witnessesService: WitnessesService) {}

  @ApiOperation({ summary: 'Lista testemunhas com filtros opcionais' })
  @ApiOkResponse({ description: 'Lista de testemunhas retornada com sucesso.' })
  @ApiUnauthorizedResponse({ description: 'Sessao ausente ou invalida.' })
  @Get()
  async findMany(@Query() query: WitnessFiltersQueryDto) {
    const result = await this.witnessesService.findMany(query);

    return {
      data: result.items,
      meta: result.meta,
    };
  }

  @ApiOperation({ summary: 'Recupera uma testemunha pelo identificador' })
  @ApiOkResponse({ description: 'Testemunha encontrada.' })
  @ApiUnauthorizedResponse({ description: 'Sessao ausente ou invalida.' })
  @ApiBadRequestResponse({ description: 'ID invalido.' })
  @ApiNotFoundResponse({ description: 'Testemunha nao encontrada.' })
  @Get(':id')
  findById(@Param() params: WitnessIdParamDto) {
    return this.witnessesService.findById(params.id);
  }

  @ApiOperation({ summary: 'Cria uma testemunha para um processo' })
  @ApiCreatedResponse({ description: 'Testemunha criada com sucesso.' })
  @ApiUnauthorizedResponse({ description: 'Sessao ausente ou invalida.' })
  @ApiBadRequestResponse({ description: 'Payload invalido.' })
  @ApiNotFoundResponse({ description: 'Processo nao encontrado.' })
  @ApiConflictResponse({ description: 'Limite de testemunhas atingido para o tipo de vara.' })
  @Post()
  create(@Body() body: CreateWitnessBodyDto) {
    return this.witnessesService.create(body as CreateWitnessInput);
  }

  @ApiOperation({ summary: 'Atualiza dados de uma testemunha' })
  @ApiOkResponse({ description: 'Testemunha atualizada com sucesso.' })
  @ApiUnauthorizedResponse({ description: 'Sessao ausente ou invalida.' })
  @ApiBadRequestResponse({ description: 'Payload ou ID invalido.' })
  @ApiNotFoundResponse({ description: 'Testemunha nao encontrada.' })
  @Patch(':id')
  update(
    @Param() params: WitnessIdParamDto,
    @Body() body: UpdateWitnessBodyDto,
  ) {
    return this.witnessesService.update(params.id, body as UpdateWitnessInput);
  }

  @ApiOperation({ summary: 'Substitui uma testemunha existente' })
  @ApiCreatedResponse({ description: 'Testemunha substituta criada e original inativada.' })
  @ApiUnauthorizedResponse({ description: 'Sessao ausente ou invalida.' })
  @ApiBadRequestResponse({ description: 'Payload ou ID invalido.' })
  @ApiNotFoundResponse({ description: 'Testemunha nao encontrada.' })
  @Post(':id/replace')
  replace(
    @Param() params: WitnessIdParamDto,
    @Body() body: ReplaceWitnessBodyDto,
  ) {
    return this.witnessesService.replace(
      params.id,
      body as ReplaceWitnessInput,
    );
  }

  @ApiOperation({ summary: 'Registra o envio da intimacao da testemunha' })
  @ApiCreatedResponse({ description: 'Intimacao registrada com sucesso.' })
  @ApiUnauthorizedResponse({ description: 'Sessao ausente ou invalida.' })
  @ApiBadRequestResponse({ description: 'Payload ou ID invalido.' })
  @ApiNotFoundResponse({ description: 'Testemunha nao encontrada.' })
  @ApiUnprocessableEntityResponse({ description: 'Testemunha substituida nao pode receber intimacao.' })
  @Post(':id/intimation')
  requestIntimation(
    @Param() params: WitnessIdParamDto,
    @Body() body: WitnessIntimationRequestBodyDto,
  ) {
    return this.witnessesService.requestIntimation(
      params.id,
      body as WitnessIntimationRequestInput,
    );
  }

  @ApiOperation({ summary: 'Registra o resultado da intimacao da testemunha' })
  @ApiCreatedResponse({ description: 'Resultado da intimacao registrado com sucesso.' })
  @ApiUnauthorizedResponse({ description: 'Sessao ausente ou invalida.' })
  @ApiBadRequestResponse({ description: 'Payload ou ID invalido.' })
  @ApiNotFoundResponse({ description: 'Testemunha nao encontrada.' })
  @Post(':id/intimation/outcome')
  registerIntimationOutcome(
    @Param() params: WitnessIdParamDto,
    @Body() body: WitnessIntimationOutcomeRequestBodyDto,
  ) {
    return this.witnessesService.registerIntimationOutcome(
      params.id,
      body as WitnessIntimationOutcomeRequestInput,
    );
  }

  @ApiOperation({ summary: 'Registra a desistencia de uma testemunha' })
  @ApiOkResponse({ description: 'Desistencia registrada e prazos ativos cancelados.' })
  @ApiUnauthorizedResponse({ description: 'Sessao ausente ou invalida.' })
  @ApiBadRequestResponse({ description: 'ID invalido.' })
  @ApiNotFoundResponse({ description: 'Testemunha nao encontrada.' })
  @Delete(':id')
  remove(@Param() params: WitnessIdParamDto) {
    return this.witnessesService.remove(params.id);
  }
}
