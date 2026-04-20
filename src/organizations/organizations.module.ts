// organizations/organizations.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from './entities/organization.entity';
import { OrganizationController } from './organizations.controller';
import { OrganizationService } from './organizations.service';
import { OrganizationRepository } from './organization.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([Organization]),
  ],
  controllers: [OrganizationController],
  providers: [
    OrganizationService,
    OrganizationRepository,
  ],
  exports: [
    OrganizationService,
    OrganizationRepository,
  ],
})
export class OrganizationModule {}
