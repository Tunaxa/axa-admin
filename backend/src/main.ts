import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
