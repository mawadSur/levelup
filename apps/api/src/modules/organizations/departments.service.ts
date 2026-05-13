import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { SessionPayload } from '@levelup/auth-client';
import { CreateDepartmentDto } from './dto/create-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async listDepartments(user: SessionPayload) {
    return this.prisma.department.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { name: 'asc' },
    });
  }

  async createDepartment(user: SessionPayload, dto: CreateDepartmentDto) {
    const existing = await this.prisma.department.findFirst({
      where: { organizationId: user.organizationId, name: dto.name },
    });
    if (existing) {
      throw new ConflictException(`Department "${dto.name}" already exists`);
    }

    const department = await this.prisma.department.create({
      data: {
        organizationId: user.organizationId,
        name: dto.name,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        actorId: user.userId,
        action: 'department.create',
        targetType: 'Department',
        targetId: department.id,
        metadata: { name: dto.name },
      },
    });

    return department;
  }

  async updateDepartment(user: SessionPayload, departmentId: string, dto: CreateDepartmentDto) {
    const existing = await this.prisma.department.findFirst({
      where: { id: departmentId, organizationId: user.organizationId },
    });
    if (!existing) throw new NotFoundException('Department not found');

    const nameConflict = await this.prisma.department.findFirst({
      where: {
        organizationId: user.organizationId,
        name: dto.name,
        id: { not: departmentId },
      },
    });
    if (nameConflict) {
      throw new ConflictException(`Department "${dto.name}" already exists`);
    }

    const updated = await this.prisma.department.update({
      where: { id: departmentId },
      data: { name: dto.name },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        actorId: user.userId,
        action: 'department.update',
        targetType: 'Department',
        targetId: departmentId,
        metadata: { previousName: existing.name, newName: dto.name },
      },
    });

    return updated;
  }

  async deleteDepartment(user: SessionPayload, departmentId: string) {
    const existing = await this.prisma.department.findFirst({
      where: { id: departmentId, organizationId: user.organizationId },
    });
    if (!existing) throw new NotFoundException('Department not found');

    await this.prisma.department.delete({ where: { id: departmentId } });

    await this.prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        actorId: user.userId,
        action: 'department.delete',
        targetType: 'Department',
        targetId: departmentId,
        metadata: { name: existing.name },
      },
    });

    return { deleted: true };
  }
}
