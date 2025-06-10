// external imports
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { join } from 'path';
// import express from 'express';
// internal imports
import { AppModule } from './app.module';
import appConfig from './config/app.config';
import { CustomExceptionFilter } from './common/exception/custom-exception.filter';
import { SojebStorage } from './common/lib/Disk/SojebStorage';

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:3000',
  'http://192.168.4.4:3000',
  'https://kzmnn7xiptpk8hxl18hv.lite.vusercontent.net',
  'https://kzmp1lbamr3ub2abo3ep.lite.vusercontent.net',
  'https://*.vusercontent.net',
  'https://*.vercel.app',
];

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  // Handle raw body for webhooks
  // app.use('/payment/stripe/webhook', express.raw({ type: 'application/json' }));

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        Logger.log('Request with no origin - allowing');
        return callback(null, true);
      }

      // Check if origin is allowed
      const isAllowed = allowedOrigins.some((allowedOrigin) => {
        if (allowedOrigin.includes('*')) {
          const pattern = new RegExp(
            '^' + allowedOrigin.replace('*', '.*') + '$',
          );
          return pattern.test(origin);
        }
        return allowedOrigin === origin;
      });

      if (!isAllowed) {
        Logger.error(`CORS Error: Blocked request from origin: ${origin}`);
        const msg =
          'The CORS policy for this site does not allow access from the specified Origin.';
        return callback(new Error(msg), false);
      }

      Logger.log(`CORS: Allowed request from origin: ${origin}`);
      return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    credentials: true,
    maxAge: 3600, // Cache preflight requests for 1 hour
  });

  // Add this CORS error handler after the CORS configuration
  app.use((err, req, res, next) => {
    if (err.message.includes('CORS')) {
      Logger.error(`CORS Error: ${err.message}`);
      return res.status(403).json({
        statusCode: 403,
        message: 'CORS Error: ' + err.message,
        timestamp: new Date().toISOString(),
        path: req.url,
        origin: req.headers.origin,
      });
    }
    next(err);
  });
  app.use(helmet());
  app.useStaticAssets(join(__dirname, '..', 'public'), {
    index: false,
    prefix: '/public',
  });
  app.useStaticAssets(join(__dirname, '..', 'public/storage'), {
    index: false,
    prefix: '/storage',
  });
  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalFilters(new CustomExceptionFilter());

  // storage setup
  SojebStorage.config({
    driver: 'local',
    connection: {
      rootUrl: appConfig().storageUrl.rootUrl,
      publicUrl: appConfig().storageUrl.rootUrlPublic,
      // aws
      awsBucket: appConfig().fileSystems.s3.bucket,
      awsAccessKeyId: appConfig().fileSystems.s3.key,
      awsSecretAccessKey: appConfig().fileSystems.s3.secret,
      awsDefaultRegion: appConfig().fileSystems.s3.region,
      awsEndpoint: appConfig().fileSystems.s3.endpoint,
      minio: true,
    },
  });

  // swagger
  const options = new DocumentBuilder()
    .setTitle(`${process.env.APP_NAME} api`)
    .setDescription(`${process.env.APP_NAME} api docs`)
    .setVersion('1.0')
    .addTag(`${process.env.APP_NAME}`)
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('api/docs', app, document);
  // end swagger

  await app.listen(process.env.PORT ?? 4000, '0.0.0.0');
}
bootstrap();


