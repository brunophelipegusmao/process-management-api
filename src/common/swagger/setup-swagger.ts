import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Gestao Processual API')
    .setDescription(
      'API REST para gerenciamento de processos, audiencias, testemunhas, prazos e relatorios.',
    )
    .setVersion('0.0.1')
    .addBearerAuth()
    .addTag('health', 'Verificacao basica da aplicacao')
    .build();

  const documentFactory = () =>
    SwaggerModule.createDocument(app, config, {
      operationIdFactory: (controllerKey: string, methodKey: string) =>
        `${controllerKey}_${methodKey}`,
    });

  SwaggerModule.setup('docs', app, documentFactory, {
    customSiteTitle: 'Gestao Processual API Docs',
    jsonDocumentUrl: 'docs/json',
    yamlDocumentUrl: 'docs/yaml',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'list',
    },
  });
}
