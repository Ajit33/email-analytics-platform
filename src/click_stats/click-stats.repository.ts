// click_stats/click-stats.repository.ts
import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  QueryFailedError,
} from 'typeorm';
import { ClickEvent } from './entities/click_event.entity';
import { Link } from './entities/link.entity';

// ── Input/output shapes aligned to real entity columns ───────────

export interface CampaignStats {
  campaignId: string;
  clicks: number;
  opens: number;
  uniqueSubscribers: number;
}

export interface CreateClickEventInput {
  organizationId: string;
  campaignId: string;
  subscriberId: string;
  linkId: string; // FIX 1: uuid string, NOT number
  // Removed: listId — ClickEvent entity has no listId column
  originalUrl?: string;
  ipAddress: string;
  userAgent: string;
  eventType: string; // plain varchar — 'click' | 'open'
  occurredAt: string;
}

@Injectable()
export class ClickStatsRepository {
  private readonly logger = new Logger(
    ClickStatsRepository.name,
  );

  constructor(
    @InjectRepository(ClickEvent)
    private readonly clickEventRepo: Repository<ClickEvent>,

    @InjectRepository(Link)
    private readonly linkRepo: Repository<Link>,
  ) {}

  // ── ClickEvent ───────────────────────────────────────────────

  async saveClickEvent(
    input: CreateClickEventInput,
  ): Promise<ClickEvent> {
    const event = this.clickEventRepo.create({
      organizationId: input.organizationId,
      campaignId: input.campaignId,
      subscriberId: input.subscriberId,
      linkId: input.linkId, // FIX 1: string uuid
      // Removed: listId — not a column on this entity
      originalUrl: input.originalUrl ?? null,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      eventType: input.eventType,
      occurredAt: new Date(input.occurredAt),
    });
    return this.clickEventRepo.save(event);
  }

  async getCampaignStats(
    campaignId: string,
    organizationId: string,
  ): Promise<CampaignStats> {
    const row = await this.clickEventRepo
      .createQueryBuilder('e')
      .select('e.campaignId', 'campaignId')
      .addSelect(
        `COALESCE(SUM(CASE WHEN e.eventType = 'click' THEN 1 ELSE 0 END), 0)::int`,
        'clicks',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN e.eventType = 'open' THEN 1 ELSE 0 END), 0)::int`,
        'opens',
      )
      .addSelect(
        'COALESCE(COUNT(DISTINCT e.subscriberId), 0)::int',
        'uniqueSubscribers',
      )
      .where('e.campaignId = :campaignId', {
        campaignId,
      })
      .andWhere(
        'e.organizationId = :organizationId',
        { organizationId },
      )
      .groupBy('e.campaignId')
      .getRawOne<{
        campaignId: string;
        clicks: number;
        opens: number;
        uniqueSubscribers: number;
      }>();

    if (!row) {
      return {
        campaignId,
        clicks: 0,
        opens: 0,
        uniqueSubscribers: 0,
      };
    }
    return row;
  }

  async findEventsByOrg(
    organizationId: string,
  ): Promise<ClickEvent[]> {
    return this.clickEventRepo.find({
      where: { organizationId },
      order: { occurredAt: 'DESC' },
      take: 500,
    });
  }

  // ── Link table ───────────────────────────────────────────────

  // FIX 7: Link has @Unique(['campaignId', 'url']) so the same URL
  // can exist for different campaigns. Must always filter by both.
  async findLinkByCampaignAndUrl(
    campaignId: string,
    url: string,
  ): Promise<Link | null> {
    return this.linkRepo.findOne({
      where: { campaignId, url },
    });
  }

  async createLink(data: {
    campaignId: string; // FIX 3: required column on Link entity
    url: string;
  }): Promise<Link> {
    // FIX 3: removed cid/hits/visits — Link entity has no such columns.
    // Link has: id(uuid), campaignId, url, clickCount, createdAt, updatedAt
    const link = this.linkRepo.create({
      campaignId: data.campaignId,
      url: data.url,
      clickCount: 0,
    });

    try {
      return await this.linkRepo.save(link);
    } catch (err) {
      if (
        err instanceof QueryFailedError &&
        (err as any).code === '23505'
      ) {
        this.logger.warn(
          `Race condition on link insert — campaign: ${data.campaignId}, url: ${data.url}`,
        );
        const existing =
          await this.linkRepo.findOne({
            where: {
              campaignId: data.campaignId,
              url: data.url,
            },
          });
        if (!existing) {
          throw new Error(
            `Link caused duplicate key but could not be fetched — ` +
              `campaign: ${data.campaignId}, url: ${data.url}`,
          );
        }
        return existing;
      }
      throw err;
    }
  }

  // FIX 4: id is uuid string, NOT number
  async findLinkById(
    id: string,
  ): Promise<Link | null> {
    return this.linkRepo.findOne({
      where: { id },
    });
  }

  async incrementLinkClickCount(
    id: string,
  ): Promise<void> {
    await this.linkRepo.increment(
      { id },
      'clickCount',
      1,
    );
  }

  // ── Entity existence checks ──────────────────────────────────
  // FIX 5: removed 'lists' check — ClickEvent has no listId column.
  // Only check campaign and subscriber which are the FK references we have.
  async checkEntitiesExist(input: {
    campaignId: string;
    subscriberId: string;
  }): Promise<{
    campaign: boolean;
    subscriber: boolean;
  }> {
    const result =
      await this.clickEventRepo.manager
        .createQueryBuilder()
        .select([
          `(SELECT COUNT(*) FROM campaigns   WHERE id = :cid)::int AS "campaignCount"`,
          `(SELECT COUNT(*) FROM subscribers WHERE id = :sid)::int AS "subscriberCount"`,
        ])
        .setParameters({
          cid: input.campaignId,
          sid: input.subscriberId,
        })
        .getRawOne<{
          campaignCount: number;
          subscriberCount: number;
        }>();

    return {
      campaign: (result?.campaignCount ?? 0) > 0,
      subscriber:
        (result?.subscriberCount ?? 0) > 0,
    };
  }
}
