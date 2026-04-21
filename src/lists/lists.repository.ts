// lists/lists.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { List } from './entities/list.entity';

@Injectable()
export class ListRepository {
  constructor(
    @InjectRepository(List)
    private readonly repo: Repository<List>,
  ) {}

  async findByNameAndOrg(
    name: string,
    orgId: string,
  ): Promise<List | null> {
    return this.repo.findOne({
      where: { name, organizationId: orgId },
    });
  }

  async findById(
    id: string,
  ): Promise<List | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByIdAndOrg(
    id: string,
    orgId: string,
  ): Promise<List | null> {
    return this.repo.findOne({
      where: { id, organizationId: orgId },
    });
  }

  async findByIdWithOrg(
    id: string,
    orgId: string,
  ): Promise<List | null> {
    return this.repo.findOne({
      where: { id, organizationId: orgId },
      relations: ['organization'],
    });
  }

  async findAllByOrg(
    orgId: string,
  ): Promise<List[]> {
    return this.repo.find({
      where: { organizationId: orgId },
      order: { createdAt: 'DESC' },
    });
  }

  async create(
    data: Partial<List>,
  ): Promise<List> {
    return this.repo.save(this.repo.create(data));
  }

  async save(list: List): Promise<List> {
    return this.repo.save(list);
  }

  async remove(list: List): Promise<void> {
    await this.repo.remove(list);
  }
}
