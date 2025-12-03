import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters';
import { SERVER, API } from './config';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  // Global exception filter - catches all unhandled errors
  app.useGlobalFilters(new AllExceptionsFilter());

  // Enable CORS
  app.enableCors({
    origin: SERVER.FRONTEND_URL,
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // API prefix
  app.setGlobalPrefix(API.PREFIX);

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('RFP Management System API')
    .setDescription('AI-Powered Request for Proposal Management System')
    .setVersion('1.0')
    .addTag('RFPs', 'Request for Proposal management')
    .addTag('Vendors', 'Vendor management')
    .addTag('Proposals', 'Vendor proposal management')
    .addTag('Comparison', 'Proposal comparison and recommendations')
    .addTag('Email', 'Email sending and receiving')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(API.DOCS_PATH, app, document);

  // Graceful shutdown handling
  const signals = ['SIGTERM', 'SIGINT'];
  signals.forEach((signal) => {
    process.on(signal, async () => {
      logger.log(`Received ${signal}, starting graceful shutdown...`);
      await app.close();
      logger.log('Application closed gracefully');
      process.exit(0);
    });
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    // Don't exit - let the app continue running
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit - let the app continue running
  });

  await app.listen(SERVER.PORT);

  logger.log(`Application is running on: http://localhost:${SERVER.PORT}`);
  logger.log(`API Documentation: http://localhost:${SERVER.PORT}/${API.DOCS_PATH}`);
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
