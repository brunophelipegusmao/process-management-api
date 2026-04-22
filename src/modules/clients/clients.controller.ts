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
} from '@nestjs/swagger';
import { z } from 'zod';

import { Roles } from '../../common/decorators/roles.decorator';
import { createZodDto } from '../../common/pipes/create-zod-dto';
import {
  clientFiltersSchema,
  createClientSchema,
  type CreateClientInput,
  type UpdateClientInput,
  updateClientSchema,
} from '../../schema/zod';
import { ClientsService } from './clients.service';

const clientIdParamSchema = z.object({
  id: z.string().uuid(),
});

class ClientIdParamDto extends createZodDto(clientIdParamSchema) {}
class CreateClientBodyDto extends createZodDto(createClientSchema) {}
class UpdateClientBodyDto extends createZodDto(updateClientSchema) {}
class ClientFiltersQueryDto extends createZodDto(clientFiltersSchema) {}

@ApiTags('clients')
@ApiBearerAuth()
@Roles('superadmin', 'advogado', 'paralegal')
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @ApiOperation({ summary: 'Lista clientes com filtros opcionais' })
  @ApiOkResponse({ description: 'Lista de clientes retornada com sucesso.' })
  @ApiUnauthorizedResponse({ description: 'Sessao ausente ou invalida.' })
  @Get()
  async findMany(@Query() query: ClientFiltersQueryDto) {
    const result = await this.clientsService.findMany(query);

    return {
      data: result.items,
      meta: result.meta,
    };
  }

  @ApiOperation({ summary: 'Recupera um cliente pelo identificador' })
  @ApiOkResponse({ description: 'Cliente encontrado.' })
  @ApiUnauthorizedResponse({ description: 'Sessao ausente ou invalida.' })
  @ApiBadRequestResponse({ description: 'ID invalido.' })
  @ApiNotFoundResponse({ description: 'Cliente nao encontrado.' })
  @Get(':id')
  findById(@Param() params: ClientIdParamDto) {
    return this.clientsService.findById(params.id);
  }

  @ApiOperation({ summary: 'Cria um cliente' })
  @ApiCreatedResponse({ description: 'Cliente criado com sucesso.' })
  @ApiUnauthorizedResponse({ description: 'Sessao ausente ou invalida.' })
  @ApiBadRequestResponse({ description: 'Payload invalido.' })
  @ApiConflictResponse({ description: 'E-mail ja cadastrado.' })
  @Post()
  create(@Body() body: CreateClientBodyDto) {
    return this.clientsService.create(body as CreateClientInput);
  }

  @ApiOperation({ summary: 'Atualiza um cliente existente' })
  @ApiOkResponse({ description: 'Cliente atualizado com sucesso.' })
  @ApiUnauthorizedResponse({ description: 'Sessao ausente ou invalida.' })
  @ApiBadRequestResponse({ description: 'Payload ou ID invalido.' })
  @ApiNotFoundResponse({ description: 'Cliente nao encontrado.' })
  @Patch(':id')
  update(@Param() params: ClientIdParamDto, @Body() body: UpdateClientBodyDto) {
    return this.clientsService.update(params.id, body as UpdateClientInput);
  }

  @ApiOperation({ summary: 'Remove um cliente' })
  @ApiOkResponse({ description: 'Cliente removido com sucesso.' })
  @ApiUnauthorizedResponse({ description: 'Sessao ausente ou invalida.' })
  @ApiBadRequestResponse({ description: 'ID invalido.' })
  @ApiNotFoundResponse({ description: 'Cliente nao encontrado.' })
  @Delete(':id')
  remove(@Param() params: ClientIdParamDto) {
    return this.clientsService.remove(params.id);
  }
}
