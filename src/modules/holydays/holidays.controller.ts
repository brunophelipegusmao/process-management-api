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
  @Get()
  async findMany(@Query() query: HolidayFiltersQueryDto) {
    const result = await this.holidaysService.findMany(query);

    return {
      data: result.items,
      meta: result.meta,
    };
  }

  @ApiOperation({ summary: 'Recupera um feriado pelo identificador' })
  @Get(':id')
  findById(@Param() params: HolidayIdParamDto) {
    return this.holidaysService.findById(params.id);
  }

  @ApiOperation({ summary: 'Cria ou consolida um feriado' })
  @Post()
  create(@Body() body: CreateHolidayBodyDto) {
    return this.holidaysService.create(body as CreateHolidayInput);
  }

  @ApiOperation({ summary: 'Atualiza um feriado existente' })
  @Patch(':id')
  update(
    @Param() params: HolidayIdParamDto,
    @Body() body: UpdateHolidayBodyDto,
  ) {
    return this.holidaysService.update(params.id, body as UpdateHolidayInput);
  }

  @ApiOperation({ summary: 'Remove um feriado' })
  @Delete(':id')
  remove(@Param() params: HolidayIdParamDto) {
    return this.holidaysService.remove(params.id);
  }
}
