// subscribers/subscriber.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Subscriber,
  SubscriberStatus,
} from './entities/subscriber.entity';

export interface SubscriberStats {
  total: number;
  active: number;
  unsubscribed: number;
  bounced: number;
}

export interface PaginatedSubscribers {
  data: Subscriber[];
  total: number;
}

@Injectable()
export class SubscriberRepository {
  constructor(
    @InjectRepository(Subscriber)
    private readonly repo: Repository<Subscriber>,
  ) {}

  async findById(
    id: string,
    orgId: string,
  ): Promise<Subscriber | null> {
    return this.repo.findOne({
      where: { id, organizationId: orgId },
    });
  }

  async findByEmailAndList(
    email: string,
    orgId: string,
    listId: string,
  ): Promise<Subscriber | null> {
    return this.repo.findOne({
      where: {
        email,
        organizationId: orgId,
        listId,
      },
    });
  }

  async findActiveByList(
    listId: string,
    orgId: string,
  ): Promise<Subscriber[]> {
    return this.repo.find({
      where: {
        listId,
        organizationId: orgId,
        status: SubscriberStatus.ACTIVE,
      },
      select: [
        'id',
        'email',
        'fullName',
        'organizationId',
        'listId',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  async findByOrganization(
    orgId: string,
    skip: number,
    take: number,
  ): Promise<PaginatedSubscribers> {
    const [data, total] =
      await this.repo.findAndCount({
        where: { organizationId: orgId },
        order: { createdAt: 'DESC' },
        skip,
        take,
      });
    return { data, total };
  }

  async findActiveByOrganization(
    orgId: string,
  ): Promise<Subscriber[]> {
    return this.repo.find({
      where: {
        organizationId: orgId,
        status: SubscriberStatus.ACTIVE,
      },
      select: [
        'id',
        'email',
        'fullName',
        'organizationId',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  async create(
    data: Partial<Subscriber>,
  ): Promise<Subscriber> {
    const subscriber = this.repo.create(data);
    return this.repo.save(subscriber);
  }

  async save(
    subscriber: Subscriber,
  ): Promise<Subscriber> {
    return this.repo.save(subscriber);
  }

  async remove(
    subscriber: Subscriber,
  ): Promise<void> {
    await this.repo.remove(subscriber);
  }

  async countByOrganization(
    orgId: string,
  ): Promise<SubscriberStats> {
    const rows = await this.repo
      .createQueryBuilder('s')
      .select('s.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('s.organizationId = :orgId', {
        orgId,
      })
      .groupBy('s.status')
      .getRawMany<{
        status: SubscriberStatus;
        count: string;
      }>();

    const counts: Record<string, number> = {};
    for (const row of rows) {
      counts[row.status] = parseInt(
        row.count,
        10,
      );
    }

    const active =
      counts[SubscriberStatus.ACTIVE] ?? 0;
    const unsubscribed =
      counts[SubscriberStatus.UNSUBSCRIBED] ?? 0;
    const bounced =
      counts[SubscriberStatus.BOUNCED] ?? 0;

    return {
      total: active + unsubscribed + bounced,
      active,
      unsubscribed,
      bounced,
    };
  }

  async findExistingEmails(
    orgId: string,
    emails: string[],
  ): Promise<Set<string>> {
    if (!emails.length) return new Set();

    const existing = await this.repo
      .createQueryBuilder('s')
      .select('s.email')
      .where('s.organizationId = :orgId', {
        orgId,
      })
      .andWhere('s.email IN (:...emails)', {
        emails,
      })
      .getMany();

    return new Set(
      existing.map((s) => s.email.toLowerCase()),
    );
  }

  async bulkSave(
    subscribers: Partial<Subscriber>[],
  ): Promise<void> {
    const created = this.repo.create(subscribers);
    await this.repo.save(created);
  }

  async segmentByOrg(
    orgId: string,
    filters: Record<string, any>,
  ): Promise<Subscriber[]> {
    const query = this.repo
      .createQueryBuilder('s')
      .where('s.organizationId = :orgId', {
        orgId,
      })
      .andWhere('s.status = :status', {
        status: SubscriberStatus.ACTIVE,
      });

    for (const [key, value] of Object.entries(
      filters,
    )) {
      query.andWhere(
        `jsonb_extract_path_text(s.customFields, :key_${key}) = :val_${key}`,
        {
          [`key_${key}`]: key,
          [`val_${key}`]: String(value),
        },
      );
    }

    return query.getMany();
  }
}
