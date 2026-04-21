// campaigns/campaigns.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Campaign,
  CampaignStatus,
} from './entities/campaign.entity';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { CampaignRepository } from './campaign.repository';
import { SubscribersService } from '../subscribers/subscribers.service';
import { QueueProducerService } from '../queues/queue-producer.service';
import { TrackingTokenService } from '../security/tracking-token.service';
import { ClickStatsService } from '../click_stats/click_stats.service';
import { sanitizeAndValidateUrl } from '../common/sanitize.util';
import { Subscriber } from '../subscribers/entities/subscriber.entity';
import { Link } from '../click_stats/entities/link.entity';

@Injectable()
export class CampaignService {
  private readonly logger = new Logger(
    CampaignService.name,
  );
  private readonly appBaseUrl: string;

  constructor(
    private readonly campaignRepo: CampaignRepository,
    private readonly subscribersService: SubscribersService,
    private readonly queueProducer: QueueProducerService,
    private readonly trackingToken: TrackingTokenService,
    private readonly config: ConfigService,
    // FIX: inject ClickStatService — removed LinkRepository,
    // link logic now lives in ClickStatService.getOrCreateLink()
    private readonly clickStatService: ClickStatsService,
  ) {
    this.appBaseUrl =
      this.config.getOrThrow<string>(
        'APP_BASE_URL',
      );
  }

  async create(
    orgId: string,
    dto: CreateCampaignDto,
  ): Promise<Campaign> {
    return this.campaignRepo.create({
      subject: dto.subject,
      content: dto.content,
      targetUrl: dto.targetUrl ?? null,
      clickTrackingDisabled:
        dto.clickTrackingDisabled ?? false,
      openTrackingDisabled:
        dto.openTrackingDisabled ?? false,
      listId: dto.listId,
      organizationId: orgId,
      status: CampaignStatus.DRAFT,
    });
  }

  async findAll(
    orgId: string,
  ): Promise<Campaign[]> {
    return this.campaignRepo.findAllByOrg(orgId);
  }

  async findById(
    id: string,
    orgId: string,
  ): Promise<Campaign> {
    const campaign =
      await this.campaignRepo.findById(id, orgId);
    if (!campaign)
      throw new NotFoundException(
        'Campaign not found',
      );
    return campaign;
  }

  async send(id: string, orgId: string) {
    const campaign = await this.findById(
      id,
      orgId,
    );

    if (
      campaign.status !== CampaignStatus.DRAFT
    ) {
      throw new BadRequestException(
        `Campaign is already ${campaign.status}`,
      );
    }

    const subscribers =
      await this.subscribersService.findActiveByList(
        campaign.listId,
        orgId,
      );

    if (!subscribers.length) {
      throw new BadRequestException(
        'No active subscribers in this list',
      );
    }

    const originalUrl =
      this.resolveTargetUrl(campaign);

    const link =
      await this.clickStatService.getOrCreateLink(
        campaign.id,
        originalUrl,
      );

    await this.campaignRepo.updateStatus(
      id,
      orgId,
      CampaignStatus.SENDING,
    );

    let queuedCount = 0;

    for (const sub of subscribers) {
      try {
        const htmlBody = this.buildTrackedHtml(
          campaign,
          sub,
          link,
          originalUrl,
        );

        await this.queueProducer.enqueueEmailEvent(
          {
            organizationId: orgId,
            campaignId: campaign.id,
            subscriberId: sub.id,
            toEmail: sub.email,
            toName: sub.fullName,
            subject: campaign.subject,
            htmlBody,
          },
        );

        queuedCount++;
      } catch (err) {
        this.logger.error(
          `Failed to queue email for ${sub.email}: ${(err as Error).message}`,
        );
      }
    }

    if (queuedCount === 0) {
      await this.campaignRepo.updateStatus(
        id,
        orgId,
        CampaignStatus.FAILED,
      );
      throw new BadRequestException(
        'Failed to queue any emails',
      );
    }

    await this.campaignRepo.updateTotalRecipients(
      campaign.id,
      queuedCount,
    );

    return {
      campaignId: campaign.id,
      status: CampaignStatus.SENDING,
      totalRecipients: subscribers.length,
      queued: queuedCount,
    };
  }

  private resolveTargetUrl(
    campaign: Campaign,
  ): string {
    if (campaign.targetUrl) {
      return sanitizeAndValidateUrl(
        campaign.targetUrl,
      );
    }
    const match = campaign.content.match(
      /https?:\/\/[^\s"'<>]+/i,
    );
    if (!match) {
      throw new BadRequestException(
        'No target URL found. Set targetUrl or include a URL in content.',
      );
    }
    return sanitizeAndValidateUrl(match[0]);
  }

  private buildTrackedHtml(
    campaign: Campaign,
    subscriber: Subscriber,
    link: Link,
    originalUrl: string,
  ): string {
    let html = campaign.content;

    if (!campaign.clickTrackingDisabled) {
      const clickToken =
        this.trackingToken.generate({
          campaignId: campaign.id,
          subscriberId: subscriber.id,
          linkId: String(link.id),
          url: originalUrl,
          eventType: 'click',
        });

      const trackUrl = `${this.appBaseUrl}/click-stats/t/${clickToken}`;
      html += `\n<br/><a href="${trackUrl}" target="_blank">Open Link</a>`;
    }

    if (!campaign.openTrackingDisabled) {
      const openToken =
        this.trackingToken.generate({
          campaignId: campaign.id,
          subscriberId: subscriber.id,
          linkId: String(link.id),
          eventType: 'open',
        });

      const pixelUrl = `${this.appBaseUrl}/click-stats/o/${openToken}`;
      html += `\n<img src="${pixelUrl}" width="1" height="1" style="display:none;" alt="" />`;
    }

    return html;
  }
}
