import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 4000 by default so the API does not collide with the frontend dev server,
  // which uses 3000.
  await app.listen(process.env.API_PORT ?? 4000);
}

await bootstrap();
