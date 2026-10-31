import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Req,
} from '@nestjs/common';

import type { AuthenticatedRequest } from '../auth/jwt-auth.guard.js';
import { RequirePermissions } from '../auth/permissions.decorator.js';
import { PermissionsService } from '../auth/permissions.service.js';
import {
  CreateDepartmentDto,
  SetManagerDto,
  UpdateDepartmentDto,
} from './dto/department.dto.js';
import {
  type DepartmentView,
  DepartmentsService,
} from './departments.service.js';

/**
 * The CEO's departments.
 *
 * Reading is open to everyone but returns only the caller's own department
 * unless they are the CEO; every write is reserved to the CEO.
 */
@Controller('departments')
export class DepartmentsController {
  constructor(
    private readonly departments: DepartmentsService,
    private readonly permissions: PermissionsService,
  ) {}

  @RequirePermissions('departments:read')
  @Get()
  async list(@Req() request: AuthenticatedRequest): Promise<DepartmentView[]> {
    const scope = await this.permissions.scope(
      request.user.org,
      request.user.sub,
    );

    return this.departments.list(request.user.org, scope);
  }

  @RequirePermissions('departments:manage')
  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateDepartmentDto,
  ): Promise<DepartmentView> {
    return this.departments.create(request.user.org, request.user.sub, dto);
  }

  @RequirePermissions('departments:manage')
  @Patch(':id')
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDepartmentDto,
  ): Promise<DepartmentView> {
    return this.departments.update(request.user.org, id, dto);
  }

  @RequirePermissions('departments:manage')
  @Put(':id/manager')
  setManager(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetManagerDto,
  ): Promise<DepartmentView> {
    return this.departments.setManager(
      request.user.org,
      request.user.sub,
      id,
      dto,
    );
  }

  @RequirePermissions('departments:manage')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.departments.remove(request.user.org, id);
  }
}
