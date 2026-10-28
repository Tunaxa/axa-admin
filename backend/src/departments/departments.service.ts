import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import type { AccessScope } from '../auth/permissions.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  CreateDepartmentDto,
  ManagerAccountDto,
  SetManagerDto,
  UpdateDepartmentDto,
} from './dto/department.dto.js';

const BCRYPT_ROUNDS = 12;

export interface DepartmentView {
  id: string;
  name: string;
  description: string | null;
  manager: { id: string; name: string; email: string } | null;
  memberCount: number;
  projectCount: number;
  createdAt: Date;
}

const SELECT = {
  id: true,
  name: true,
  description: true,
  createdAt: true,
  manager: { select: { id: true, name: true, email: true } },
  _count: { select: { members: true, projects: true } },
} satisfies Prisma.DepartmentSelect;

type Row = Prisma.DepartmentGetPayload<{ select: typeof SELECT }>;

function toView(row: Row): DepartmentView {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    manager: row.manager,
    memberCount: row._count.members,
    projectCount: row._count.projects,
    createdAt: row.createdAt,
  };
}

/**
 * Departments.
 *
 * Only the CEO creates, renames, reassigns or removes one; everybody else
 * merely reads the department they belong to.
 */
@Injectable()
export class DepartmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** The CEO sees every department; anyone else sees only their own. */
  async list(
    organizationId: string,
    scope: AccessScope,
  ): Promise<DepartmentView[]> {
    if (!scope.seeAll && !scope.departmentId) {
      return [];
    }

    const rows = await this.prisma.department.findMany({
      where: {
        organizationId,
        ...(scope.seeAll ? {} : { id: scope.departmentId! }),
      },
      select: SELECT,
      orderBy: { name: 'asc' },
    });

    return rows.map(toView);
  }

  async create(
    organizationId: string,
    actorId: string,
    dto: CreateDepartmentDto,
  ): Promise<DepartmentView> {
    if (dto.manager) {
      await this.assertEmailFree(organizationId, dto.manager.email);
    }

    const passwordHash = dto.manager
      ? await bcrypt.hash(dto.manager.password, BCRYPT_ROUNDS)
      : null;

    let result: { departmentId: string; managerUserId: string | null };

    try {
      result = await this.prisma.$transaction(async (tx) => {
        const department = await tx.department.create({
          data: {
            organizationId,
            name: dto.name.trim(),
            description: dto.description?.trim() || null,
          },
          select: { id: true },
        });

        let managerUserId: string | null = null;

        if (dto.manager && passwordHash) {
          managerUserId = await this.createManagerAccount(
            tx,
            organizationId,
            department.id,
            dto.manager,
            passwordHash,
          );
          await tx.department.update({
            where: { id: department.id },
            data: { managerId: managerUserId },
          });
        }

        return { departmentId: department.id, managerUserId };
      });
    } catch (cause: unknown) {
      throw this.asNameConflict(cause, dto.name);
    }

    if (result.managerUserId) {
      void this.notifications.push({
        organizationId,
        recipientId: result.managerUserId,
        actorId,
        type: 'team_joined',
        title: `Tu diriges le département ${dto.name.trim()}`,
        body: 'Tu peux créer des projets et ajouter des membres à ton équipe.',
        link: '/team',
      });
    }

    return this.findView(organizationId, result.departmentId);
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateDepartmentDto,
  ): Promise<DepartmentView> {
    await this.findInTenant(organizationId, id);

    try {
      await this.prisma.department.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description.trim() || null }
            : {}),
        },
      });
    } catch (cause: unknown) {
      throw this.asNameConflict(cause, dto.name ?? '');
    }

    return this.findView(organizationId, id);
  }

  /**
   * Puts somebody in charge of the department.
   *
   * Either a new account, or somebody who already sits in the department. The
   * previous manager stays on as an ordinary member rather than being thrown
   * out: replacing a manager is a reshuffle, not a dismissal.
   */
  async setManager(
    organizationId: string,
    actorId: string,
    id: string,
    dto: SetManagerDto,
  ): Promise<DepartmentView> {
    const department = await this.findInTenant(organizationId, id);

    if (!dto.userId && !dto.account) {
      throw new BadRequestException(
        'Provide either userId or account for the new manager',
      );
    }

    if (dto.account) {
      await this.assertEmailFree(organizationId, dto.account.email);
    }

    const passwordHash = dto.account
      ? await bcrypt.hash(dto.account.password, BCRYPT_ROUNDS)
      : null;

    const newManagerId = await this.prisma.$transaction(async (tx) => {
      let userId: string;

      if (dto.account && passwordHash) {
        userId = await this.createManagerAccount(
          tx,
          organizationId,
          id,
          dto.account,
          passwordHash,
        );
      } else {
        const member = await tx.teamMember.findFirst({
          where: { organizationId, userId: dto.userId!, departmentId: id },
          select: { id: true },
        });

        if (!member) {
          throw new BadRequestException(
            'That person is not a member of this department',
          );
        }

        await tx.teamMember.update({
          where: { id: member.id },
          data: { role: 'dev_team_leader' },
        });
        userId = dto.userId!;
      }

      if (department.managerId && department.managerId !== userId) {
        await tx.teamMember.updateMany({
          where: {
            organizationId,
            userId: department.managerId,
            departmentId: id,
          },
          data: { role: 'developer' },
        });
      }

      await tx.department.update({
        where: { id },
        data: { managerId: userId },
      });

      return userId;
    });

    void this.notifications.push({
      organizationId,
      recipientId: newManagerId,
      actorId,
      type: 'team_joined',
      title: `Tu diriges le département ${department.name}`,
      body: 'Tu peux créer des projets et ajouter des membres à ton équipe.',
      link: '/team',
    });

    return this.findView(organizationId, id);
  }

  /** A department can only go once it is empty. */
  async remove(organizationId: string, id: string): Promise<void> {
    await this.findInTenant(organizationId, id);

    const [members, projects] = await Promise.all([
      this.prisma.teamMember.count({
        where: { organizationId, departmentId: id },
      }),
      this.prisma.project.count({
        where: { organizationId, departmentId: id },
      }),
    ]);

    if (members > 0 || projects > 0) {
      throw new ConflictException(
        `Le département contient encore ${members} membre(s) et ${projects} projet(s)`,
      );
    }

    await this.prisma.department.delete({ where: { id } });
  }

  private async createManagerAccount(
    tx: Prisma.TransactionClient,
    organizationId: string,
    departmentId: string,
    account: ManagerAccountDto,
    passwordHash: string,
  ): Promise<string> {
    const user = await tx.user.create({
      data: {
        organizationId,
        email: account.email.toLowerCase(),
        name: account.name.trim(),
        passwordHash,
      },
      select: { id: true },
    });

    await tx.teamMember.create({
      data: {
        organizationId,
        userId: user.id,
        role: 'dev_team_leader',
        departmentId,
      },
    });

    return user.id;
  }

  private async assertEmailFree(
    organizationId: string,
    email: string,
  ): Promise<void> {
    const existing = await this.prisma.user.findUnique({
      where: {
        organizationId_email: { organizationId, email: email.toLowerCase() },
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(
        'A user with that email already exists in this organization',
      );
    }
  }

  private async findInTenant(organizationId: string, id: string) {
    const department = await this.prisma.department.findFirst({
      where: { id, organizationId },
    });

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    return department;
  }

  private async findView(
    organizationId: string,
    id: string,
  ): Promise<DepartmentView> {
    const row = await this.prisma.department.findFirstOrThrow({
      where: { id, organizationId },
      select: SELECT,
    });

    return toView(row);
  }

  private asNameConflict(cause: unknown, name: string): unknown {
    if (
      cause instanceof Prisma.PrismaClientKnownRequestError &&
      cause.code === 'P2002'
    ) {
      return new ConflictException(
        `Un département "${name.trim()}" existe déjà`,
      );
    }

    return cause;
  }
}
