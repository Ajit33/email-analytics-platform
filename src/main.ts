import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  BadRequestException,
  Logger,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import helmet from 'helmet';
import * as compression from 'compression';

async function bootstrap() {
  const app = await NestFactory.create(
    AppModule,
    {
      logger: ['error', 'warn', 'log'],
    },
  );

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 8000);
  const isProduction =
    config.get('NODE_ENV') === 'production';

  app.use(helmet());
  app.use(compression());
  app.setGlobalPrefix('api');

  app.enableCors({
    credentials: true,
    origin: isProduction
      ? config.get<string>(
          'CORS_ORIGIN',
          'https://yourdomain.com',
        )
      : true,
    optionsSuccessStatus: 200,
  });

  app.useGlobalFilters(
    new GlobalExceptionFilter(),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      stopAtFirstError: true,
      exceptionFactory: (errors) => {
        const messages = errors.map((error) => ({
          field: error.property,
          errors: Object.values(
            error.constraints || {},
          ),
        }));
        return new BadRequestException({
          statusCode: 400,
          message: 'Validation failed',
          errors: messages,
        });
      },
    }),
  );

  app.enableShutdownHooks();

  await app.listen(port);

  Logger.log(
    `Application running on http://localhost:${port}/api`,
    'Bootstrap',
  );
  Logger.log(
    `Environment: ${config.get('NODE_ENV', 'development')}`,
    'Bootstrap',
  );
}

bootstrap().catch((err) => {
  Logger.error(
    'Application failed to start',
    err,
    'Bootstrap',
  );
  process.exit(1);
});
