// click-stats/click.worker.ts
import {
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  Processor,
  WorkerHost,
  OnWorkerEvent,
} from '@nestjs/bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import {
  Job,
  Queue,
  UnrecoverableError,
} from 'bullmq';
import { validate as isUuid } from 'uuid';
import { ClickEventRepository } from './click-event.repository';
import { LinkRepository } from './link.repository';
import { CampaignRepository } from '../campaigns/campaign.repository';
import { QueueNames } from '../queues/queue.constants';
import { StatsGateway } from '../realtime/stats.gateway';

export interface ClickEventJobData {
  campaignId: string;
  subscriberId: string;
  linkId: string;
  originalUrl?: string;
  ipAddress: string;
  userAgent: string;
  eventType: 'click' | 'open';
  occurredAt: string;
}

@Processor(QueueNames.CLICK)
@Injectable()
export class ClickWorker extends WorkerHost {
  private readonly logger = new Logger(
    ClickWorker.name,
  );

  constructor(
    private readonly clickEventRepo: ClickEventRepository,
    private readonly linkRepo: LinkRepository,
    private readonly campaignRepo: CampaignRepository,
    @InjectQueue(QueueNames.DLQ)
    private readonly dlq: Queue,
    private readonly statsGateway: StatsGateway,
  ) {
    super();
  }

  async process(
    job: Job<ClickEventJobData>,
  ): Promise<void> {
    const data = job.data;

    this.validatePayload(data, job.id as string);

    // Worker resolves organizationId from campaign record
    const orgId = await this.resolveOrgId(
      data.campaignId,
      job.id as string,
    );

    await this.clickEventRepo.save({
      organizationId: orgId,
      campaignId: data.campaignId,
      subscriberId: data.subscriberId,
      linkId: data.linkId,
      originalUrl: data.originalUrl ?? null,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      eventType: data.eventType,
      occurredAt: new Date(data.occurredAt),
    });

    if (
      data.eventType === 'click' &&
      data.linkId
    ) {
      await this.linkRepo
        .incrementClickCount(data.linkId)
        .catch((err) =>
          this.logger.warn(
            `Link increment failed: ${err.message}`,
          ),
        );
    }

    if (data.eventType === 'open') {
      await this.campaignRepo
        .incrementOpenedCount(data.campaignId)
        .catch((err) =>
          this.logger.warn(
            `Open count increment failed: ${err.message}`,
          ),
        );
    }

    this.statsGateway
      .emitClickUpdate(orgId, data.campaignId)
      .catch((err) =>
        this.logger.warn(
          `WS emit failed: ${err.message}`,
        ),
      );
  }

  @OnWorkerEvent('failed')
  async onFailed(
    job: Job<ClickEventJobData>,
    err: Error,
  ): Promise<void> {
    this.logger.error(
      `Job ${job.id} failed after ${job.attemptsMade} attempts: ${err.message}`,
    );

    if (
      job.attemptsMade >= (job.opts.attempts ?? 3)
    ) {
      try {
        await this.dlq.add('dlq.click', {
          originalJobId: job.id,
          data: job.data,
          error: err.message,
          failedAt: new Date().toISOString(),
        });
      } catch (dlqErr) {
        this.logger.error(
          `DLQ push failed: ${(dlqErr as Error).message}`,
        );
      }
    }
  }

  private validatePayload(
    data: ClickEventJobData,
    jobId: string,
  ): void {
    if (
      !data.campaignId ||
      !isUuid(data.campaignId)
    ) {
      throw new UnrecoverableError(
        `Job ${jobId}: invalid campaignId`,
      );
    }
    if (
      !data.subscriberId ||
      !isUuid(data.subscriberId)
    ) {
      throw new UnrecoverableError(
        `Job ${jobId}: invalid subscriberId`,
      );
    }
    if (
      !['click', 'open'].includes(data.eventType)
    ) {
      throw new UnrecoverableError(
        `Job ${jobId}: invalid eventType "${data.eventType}"`,
      );
    }
    if (
      data.eventType === 'click' &&
      !data.originalUrl
    ) {
      throw new UnrecoverableError(
        `Job ${jobId}: click event missing originalUrl`,
      );
    }
  }

  private async resolveOrgId(
    campaignId: string,
    jobId: string,
  ): Promise<string> {
    const campaign =
      await this.campaignRepo.findByIdInternal(
        campaignId,
      );
    if (!campaign) {
      throw new UnrecoverableError(
        `Job ${jobId}: campaign ${campaignId} not found`,
      );
    }
    return campaign.organizationId;
  }
}
