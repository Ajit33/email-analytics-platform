// organizations/organization.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from './entities/organization.entity';

@Injectable()
export class OrganizationRepository {
  constructor(
    @InjectRepository(Organization)
    private readonly repo: Repository<Organization>,
  ) {}

  async findById(
    id: string,
  ): Promise<Organization | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByName(
    name: string,
  ): Promise<Organization | null> {
    return this.repo.findOne({ where: { name } });
  }

  async existsById(id: string): Promise<boolean> {
    const count = await this.repo.count({
      where: { id },
    });
    return count > 0;
  }

  async create(
    data: Partial<Organization>,
  ): Promise<Organization> {
    const org = this.repo.create(data);
    return this.repo.save(org);
  }

  async save(
    org: Organization,
  ): Promise<Organization> {
    return this.repo.save(org);
  }

  async remove(org: Organization): Promise<void> {
    await this.repo.remove(org);
  }
}
