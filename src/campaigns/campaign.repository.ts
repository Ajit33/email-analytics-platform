// campaigns/campaign.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Campaign,
  CampaignStatus,
} from './entities/campaign.entity';

@Injectable()
export class CampaignRepository {
  constructor(
    @InjectRepository(Campaign)
    private readonly repo: Repository<Campaign>,
  ) {}

  async findById(
    id: string,
    orgId: string,
  ): Promise<Campaign | null> {
    return this.repo.findOne({
      where: { id, organizationId: orgId },
      relations: ['list'],
    });
  }

  async findAllByOrg(
    orgId: string,
  ): Promise<Campaign[]> {
    return this.repo.find({
      where: { organizationId: orgId },
      relations: ['list'],
      order: { createdAt: 'DESC' },
    });
  }

  async create(
    data: Partial<Campaign>,
  ): Promise<Campaign> {
    return this.repo.save(this.repo.create(data));
  }

  async updateStatus(
    id: string,
    orgId: string,
    status: CampaignStatus,
  ): Promise<void> {
    await this.repo.update(
      { id, organizationId: orgId },
      { status },
    );
  }

  // Added — service calls this after queueing all emails.
  // Uses update() with a WHERE clause instead of save() with a partial entity.
  // save() on a partial object can accidentally null out other columns
  // if TypeORM thinks the missing fields should be cleared.
  async updateTotalRecipients(
    id: string,
    count: number,
  ): Promise<void> {
    await this.repo.update(
      { id },
      { totalRecipients: count },
    );
  }
  async findByIdInternal(
    id: string,
  ): Promise<Campaign | null> {
    return this.repo.findOne({
      where: { id },
      select: ['id', 'organizationId'],
    });
  }
  async incrementSentCount(
    id: string,
  ): Promise<void> {
    await this.repo.increment(
      { id },
      'sentCount',
      1,
    );
  }

  async incrementOpenedCount(
    id: string,
  ): Promise<void> {
    await this.repo.increment(
      { id },
      'openedCount',
      1,
    );
  }

  async save(
    campaign: Campaign,
  ): Promise<Campaign> {
    return this.repo.save(campaign);
  }
}
