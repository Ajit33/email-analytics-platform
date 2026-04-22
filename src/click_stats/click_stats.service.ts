// click-stats/click-stats.service.ts
import {
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import {
  TrackingTokenService,
  TrackingPayload,
} from '../security/tracking-token.service';
import { QueueProducerService } from '../queues/queue-producer.service';
import {
  ClickEventRepository,
  CampaignClickStats,
} from './click-event.repository';
import { LinkRepository } from './link.repository';
import { Link } from './entities/link.entity';
import {
  sanitizeAndValidateUrl,
  sanitizeIp,
  sanitizeUserAgent,
} from '../common/sanitize.util';

export interface ClickTrackingPayload {
  campaignId: string;
  subscriberId: string;
  linkId: string;
  eventType: 'click' | 'open';
  url?: string;
}

@Injectable()
export class ClickStatsService {
  private readonly logger = new Logger(
    ClickStatsService.name,
  );

  constructor(
    private readonly trackingToken: TrackingTokenService,
    private readonly queueProducer: QueueProducerService,
    private readonly clickEventRepo: ClickEventRepository,
    private readonly linkRepo: LinkRepository,
  ) {}

  validateClickToken(
    token: string,
  ): ClickTrackingPayload {
    const raw = this.trackingToken.verify(token);
    if (raw.evt !== 'click' || !raw.url) {
      throw new UnauthorizedException(
        'Invalid click token',
      );
    }
    return this.mapPayload(raw);
  }

  validateOpenToken(
    token: string,
  ): ClickTrackingPayload {
    const raw = this.trackingToken.verify(token);
    if (raw.evt !== 'open') {
      throw new UnauthorizedException(
        'Invalid open token',
      );
    }
    return this.mapPayload(raw);
  }

  async pushClickToQueue(
    payload: ClickTrackingPayload,
    ip: string,
    userAgent: string,
  ): Promise<void> {
    await this.queueProducer.enqueueClickEvent({
      campaignId: payload.campaignId,
      subscriberId: payload.subscriberId,
      linkId: payload.linkId,
      originalUrl: payload.url,
      ipAddress: sanitizeIp(ip),
      userAgent: sanitizeUserAgent(userAgent),
      eventType: 'click',
      occurredAt: new Date().toISOString(),
    });
  }

  async pushOpenToQueue(
    payload: ClickTrackingPayload,
    ip: string,
    userAgent: string,
  ): Promise<void> {
    await this.queueProducer.enqueueClickEvent({
      campaignId: payload.campaignId,
      subscriberId: payload.subscriberId,
      linkId: payload.linkId,
      ipAddress: sanitizeIp(ip),
      userAgent: sanitizeUserAgent(userAgent),
      eventType: 'open',
      occurredAt: new Date().toISOString(),
    });
  }

  async getCampaignStats(
    campaignId: string,
    orgId: string,
  ): Promise<CampaignClickStats> {
    return this.clickEventRepo.getCampaignStats(
      campaignId,
      orgId,
    );
  }

  async getEventsByOrg(orgId: string) {
    return this.clickEventRepo.getEventsByOrg(
      orgId,
    );
  }

  async getOrCreateLink(
    campaignId: string,
    rawUrl: string,
  ): Promise<Link> {
    const url = sanitizeAndValidateUrl(rawUrl);
    const existing =
      await this.linkRepo.findByCampaignAndUrl(
        campaignId,
        url,
      );
    if (existing) return existing;
    return this.linkRepo.create({
      campaignId,
      url,
    });
  }

  private mapPayload(
    raw: TrackingPayload,
  ): ClickTrackingPayload {
    return {
      campaignId: raw.cid,
      subscriberId: raw.sid,
      linkId: raw.lid,
      eventType: raw.evt,
      url: raw.url,
    };
  }
}
