import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { appEnv } from './config/app-env';
import { setupSwagger } from './common/swagger/setup-swagger';
import { registerAuthRoutes } from './modules/auth/auth';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  app.enableCors({
    origin: appEnv.cors.allowedOrigins,
    credentials: true,
  });

  await registerAuthRoutes(app);
  setupSwagger(app);

  await app.listen(appEnv.port, '0.0.0.0');
}
bootstrap();
