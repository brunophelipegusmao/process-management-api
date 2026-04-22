import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AppService } from './app.service';
import { CurrentUser } from './common/decorators/current-user.decorator';
import { Public } from './common/decorators/public.decorator';
import type { AuthenticatedUser } from './common/guards/auth.guard';
import { userProfileValues } from './schema';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @ApiOperation({ summary: 'Health check inicial da aplicacao' })
  @ApiOkResponse({
    description: 'Aplicacao respondendo normalmente.',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'string',
          example: 'Hello World!',
        },
      },
    },
  })
  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @ApiOperation({ summary: 'Health check dedicado — compativel com monitoramento' })
  @ApiOkResponse({
    description: 'Aplicacao saudavel.',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        uptime: { type: 'number', example: 123.45 },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  @Public()
  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retorna o usuario autenticado da sessao atual' })
  @ApiOkResponse({
    description: 'Usuario autenticado recuperado com sucesso.',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            name: {
              type: 'string',
            },
            email: {
              type: 'string',
              format: 'email',
            },
            profile: {
              type: 'string',
              enum: [...userProfileValues],
            },
            active: {
              type: 'boolean',
            },
          },
          required: ['id', 'name', 'email', 'profile', 'active'],
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Sessao ausente ou invalida.' })
  @Get('me')
  getCurrentUser(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }
}
