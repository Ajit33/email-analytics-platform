// click_stats/click-event.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClickEvent } from './entities/click_event.entity';

export interface CampaignClickStats {
  campaignId: string;
  totalClicks: number;
  totalOpens: number;
  uniqueClickers: number;
}

export interface SaveClickEventInput {
  organizationId: string;
  campaignId: string;
  subscriberId: string;
  linkId: string;
  originalUrl?: string;
  ipAddress: string;
  userAgent: string;
  eventType: string;
  occurredAt: Date;
}

@Injectable()
export class ClickEventRepository {
  constructor(
    @InjectRepository(ClickEvent)
    private readonly repo: Repository<ClickEvent>,
  ) {}

  async save(
    input: SaveClickEventInput,
  ): Promise<ClickEvent> {
    const event = this.repo.create({
      organizationId: input.organizationId,
      campaignId: input.campaignId,
      subscriberId: input.subscriberId,
      linkId: input.linkId,
      originalUrl: input.originalUrl ?? null,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      eventType: input.eventType,
      occurredAt: input.occurredAt,
    });
    return this.repo.save(event);
  }

  async getCampaignStats(
    campaignId: string,
    orgId: string,
  ): Promise<CampaignClickStats> {
    const row = await this.repo
      .createQueryBuilder('e')
      .select('e.campaignId', 'campaignId')
      .addSelect(
        `COALESCE(SUM(CASE WHEN e.eventType = 'click' THEN 1 ELSE 0 END), 0)::int`,
        'totalClicks',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN e.eventType = 'open' THEN 1 ELSE 0 END), 0)::int`,
        'totalOpens',
      )
      .addSelect(
        'COALESCE(COUNT(DISTINCT e.subscriberId), 0)::int',
        'uniqueClickers',
      )
      .where('e.campaignId = :campaignId', {
        campaignId,
      })
      .andWhere('e.organizationId = :orgId', {
        orgId,
      })
      .groupBy('e.campaignId')
      .getRawOne();

    if (!row) {
      return {
        campaignId,
        totalClicks: 0,
        totalOpens: 0,
        uniqueClickers: 0,
      };
    }

    return row;
  }

  // FIX: cutoff was computed but never used in the WHERE clause.
  // The method was always returning whether ANY click existed, ignoring the window.
  // Fixed to actually filter by the time window using occurredAt >= cutoff.
  async hasRecentEvent(
    subscriberId: string,
    linkId: string,
    windowSeconds: number,
  ): Promise<boolean> {
    const cutoff = new Date(
      Date.now() - windowSeconds * 1000,
    );

    const count = await this.repo
      .createQueryBuilder('e')
      .where('e.subscriberId = :subscriberId', {
        subscriberId,
      })
      .andWhere('e.linkId = :linkId', { linkId })
      .andWhere('e.eventType = :type', {
        type: 'click',
      })
      // FIX: actually use cutoff in the query — was ignored before
      .andWhere('e.occurredAt >= :cutoff', {
        cutoff,
      })
      .getCount();

    return count > 0;
  }

  async getEventsByOrg(
    orgId: string,
    limit = 100,
  ): Promise<ClickEvent[]> {
    return this.repo.find({
      where: { organizationId: orgId },
      order: { occurredAt: 'DESC' },
      take: limit,
    });
  }
}
