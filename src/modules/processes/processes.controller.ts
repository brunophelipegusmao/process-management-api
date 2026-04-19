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
  createProcessSchema,
  type CreateProcessInput,
  processFiltersSchema,
  type UpdateProcessInput,
  updateProcessSchema,
} from '../../schema/zod';
import { ProcessesService } from './processes.service';

const processIdParamSchema = z.object({
  id: z.string().uuid(),
});

class ProcessIdParamDto extends createZodDto(processIdParamSchema) {}
class CreateProcessBodyDto extends createZodDto(createProcessSchema) {}
class UpdateProcessBodyDto extends createZodDto(updateProcessSchema) {}
class ProcessFiltersQueryDto extends createZodDto(processFiltersSchema) {}

@ApiTags('processes')
@ApiBearerAuth()
@Roles('superadmin', 'advogado', 'paralegal')
@Controller('processes')
export class ProcessesController {
  constructor(private readonly processesService: ProcessesService) {}

  @ApiOperation({ summary: 'Lista processos com filtros opcionais' })
  @Get()
  async findMany(@Query() query: ProcessFiltersQueryDto) {
    const result = await this.processesService.findMany(query);

    return {
      data: result.items,
      meta: result.meta,
    };
  }

  @ApiOperation({ summary: 'Recupera um processo pelo identificador' })
  @Get(':id')
  findById(@Param() params: ProcessIdParamDto) {
    return this.processesService.findById(params.id);
  }

  @ApiOperation({ summary: 'Cria um processo' })
  @Post()
  create(@Body() body: CreateProcessBodyDto) {
    return this.processesService.create(body as CreateProcessInput);
  }

  @ApiOperation({ summary: 'Atualiza um processo existente' })
  @Patch(':id')
  update(
    @Param() params: ProcessIdParamDto,
    @Body() body: UpdateProcessBodyDto,
  ) {
    return this.processesService.update(params.id, body as UpdateProcessInput);
  }

  @ApiOperation({ summary: 'Remove um processo' })
  @Delete(':id')
  remove(@Param() params: ProcessIdParamDto) {
    return this.processesService.remove(params.id);
  }
}
