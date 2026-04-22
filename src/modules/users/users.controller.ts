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
  createUserSchema,
  type CreateUserInput,
  type UpdateUserInput,
  updateUserSchema,
  userFiltersSchema,
} from '../../schema/zod';
import { UsersService } from './users.service';

const userIdParamSchema = z.object({
  id: z.string().uuid(),
});

class UserIdParamDto extends createZodDto(userIdParamSchema) {}
class CreateUserBodyDto extends createZodDto(createUserSchema) {}
class UpdateUserBodyDto extends createZodDto(updateUserSchema) {}
class UserFiltersQueryDto extends createZodDto(userFiltersSchema) {}

@ApiTags('users')
@ApiBearerAuth()
@Roles('superadmin')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'Lista usuarios com filtros opcionais' })
  @ApiOkResponse({ description: 'Lista de usuarios retornada com sucesso.' })
  @ApiUnauthorizedResponse({ description: 'Sessao ausente ou invalida.' })
  @Get()
  async findMany(@Query() query: UserFiltersQueryDto) {
    const result = await this.usersService.findMany(query);

    return {
      data: result.items,
      meta: result.meta,
    };
  }

  @ApiOperation({ summary: 'Recupera um usuario pelo identificador' })
  @ApiOkResponse({ description: 'Usuario encontrado.' })
  @ApiUnauthorizedResponse({ description: 'Sessao ausente ou invalida.' })
  @ApiBadRequestResponse({ description: 'ID invalido.' })
  @ApiNotFoundResponse({ description: 'Usuario nao encontrado.' })
  @Get(':id')
  findById(@Param() params: UserIdParamDto) {
    return this.usersService.findById(params.id);
  }

  @ApiOperation({ summary: 'Cria um usuario administrativo' })
  @ApiCreatedResponse({ description: 'Usuario criado com sucesso.' })
  @ApiUnauthorizedResponse({ description: 'Sessao ausente ou invalida.' })
  @ApiBadRequestResponse({ description: 'Payload invalido.' })
  @ApiConflictResponse({ description: 'E-mail ja cadastrado.' })
  @Post()
  create(@Body() body: CreateUserBodyDto) {
    return this.usersService.create(body as CreateUserInput);
  }

  @ApiOperation({ summary: 'Atualiza um usuario existente' })
  @ApiOkResponse({ description: 'Usuario atualizado com sucesso.' })
  @ApiUnauthorizedResponse({ description: 'Sessao ausente ou invalida.' })
  @ApiBadRequestResponse({ description: 'Payload ou ID invalido.' })
  @ApiNotFoundResponse({ description: 'Usuario nao encontrado.' })
  @Patch(':id')
  update(@Param() params: UserIdParamDto, @Body() body: UpdateUserBodyDto) {
    return this.usersService.update(params.id, body as UpdateUserInput);
  }

  @ApiOperation({ summary: 'Remove um usuario, exceto o superadmin' })
  @ApiOkResponse({ description: 'Usuario removido com sucesso.' })
  @ApiUnauthorizedResponse({ description: 'Sessao ausente ou invalida.' })
  @ApiBadRequestResponse({ description: 'ID invalido.' })
  @ApiNotFoundResponse({ description: 'Usuario nao encontrado.' })
  @ApiConflictResponse({ description: 'Superadmin nao pode ser removido pela API.' })
  @Delete(':id')
  remove(@Param() params: UserIdParamDto) {
    return this.usersService.remove(params.id);
  }
}
