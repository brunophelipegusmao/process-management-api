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
  createWitnessSchema,
  type CreateWitnessInput,
  replaceWitnessSchema,
  type ReplaceWitnessInput,
  type UpdateWitnessInput,
  updateWitnessSchema,
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
class WitnessFiltersQueryDto extends createZodDto(witnessFiltersSchema) {}

@ApiTags('witnesses')
@ApiBearerAuth()
@Roles('superadmin', 'advogado', 'paralegal')
@Controller('witnesses')
export class WitnessesController {
  constructor(private readonly witnessesService: WitnessesService) {}

  @ApiOperation({ summary: 'Lista testemunhas com filtros opcionais' })
  @Get()
  async findMany(@Query() query: WitnessFiltersQueryDto) {
    const result = await this.witnessesService.findMany(query);

    return {
      data: result.items,
      meta: result.meta,
    };
  }

  @ApiOperation({ summary: 'Recupera uma testemunha pelo identificador' })
  @Get(':id')
  findById(@Param() params: WitnessIdParamDto) {
    return this.witnessesService.findById(params.id);
  }

  @ApiOperation({ summary: 'Cria uma testemunha para um processo' })
  @Post()
  create(@Body() body: CreateWitnessBodyDto) {
    return this.witnessesService.create(body as CreateWitnessInput);
  }

  @ApiOperation({ summary: 'Atualiza dados de uma testemunha' })
  @Patch(':id')
  update(
    @Param() params: WitnessIdParamDto,
    @Body() body: UpdateWitnessBodyDto,
  ) {
    return this.witnessesService.update(params.id, body as UpdateWitnessInput);
  }

  @ApiOperation({ summary: 'Substitui uma testemunha existente' })
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

  @ApiOperation({ summary: 'Registra a desistencia de uma testemunha' })
  @Delete(':id')
  remove(@Param() params: WitnessIdParamDto) {
    return this.witnessesService.remove(params.id);
  }
}
