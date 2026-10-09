import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // GitHub signs the raw request body. Re-serialising the parsed JSON would
    // not reproduce the bytes it hashed — key order and whitespace both
    // matter — so the buffer has to be kept.
    rawBody: true,
  });

  // The frontend is served from a different origin, so the browser will not
  // let it call this API without an explicit allowance. Origins are listed
  // rather than reflected, so a misconfigured deployment fails closed.
  app.enableCors({
    origin: (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      // Strip unknown properties and reject requests that send them, so a
      // typo in a client payload fails loudly instead of being ignored.
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 4000 by default so the API does not collide with the frontend dev server,
  // which uses 3000.
  await app.listen(process.env.API_PORT ?? 4000);
}

await bootstrap();
