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
  @Get()
  async findMany(@Query() query: DeadlineFiltersQueryDto) {
    const result = await this.deadlinesService.findMany(query);

    return {
      data: result.items,
      meta: result.meta,
    };
  }

  @ApiOperation({ summary: 'Recupera um prazo pelo identificador' })
  @Get(':id')
  findById(@Param() params: DeadlineIdParamDto) {
    return this.deadlinesService.findById(params.id);
  }

  @ApiOperation({ summary: 'Cria um prazo calculando a data automaticamente' })
  @Post()
  create(@Body() body: CreateDeadlineBodyDto) {
    return this.deadlinesService.create(body as CreateDeadlineInput);
  }

  @ApiOperation({ summary: 'Atualiza um prazo existente' })
  @Patch(':id')
  update(
    @Param() params: DeadlineIdParamDto,
    @Body() body: UpdateDeadlineBodyDto,
  ) {
    return this.deadlinesService.update(params.id, body as UpdateDeadlineInput);
  }

  @ApiOperation({ summary: 'Cancela um prazo existente' })
  @Delete(':id')
  remove(@Param() params: DeadlineIdParamDto) {
    return this.deadlinesService.remove(params.id);
  }
}
