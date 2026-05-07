import { Module } from '@nestjs/common';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';
import { DepartmentsController } from './departments.controller';
import { DepartmentsService } from './departments.service';

@Module({
  controllers: [OrganizationsController, InvitationsController, DepartmentsController],
  providers: [OrganizationsService, InvitationsService, DepartmentsService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
