# @axa-admin/config

Shared build and formatting presets for the monorepo.

Keeping these in one package means a convention is changed in a single place
instead of being copied into every app.

| Export                            | Purpose                                              |
| --------------------------------- | ---------------------------------------------------- |
| `@axa-admin/config/tsconfig/base` | Base preset for libraries                            |
| `@axa-admin/config/tsconfig/next` | Preset for the Next.js frontend                      |
| `@axa-admin/config/tsconfig/nest` | Preset for the NestJS backend (decorators, CommonJS) |
| `@axa-admin/config/prettier`      | Shared Prettier configuration                        |
