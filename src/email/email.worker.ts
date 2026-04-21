// email/email.worker.ts
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
import { QueueNames } from '../queues/queue.constants';
import { EmailEventJob } from '../queues/queue-jobs.types';
import { EmailService } from './email.service';
import { CampaignRepository } from '../campaigns/campaign.repository';
import { CampaignStatus } from '../campaigns/entities/campaign.entity';
import { StatsGateway } from '../realtime/stats.gateway';

@Processor(QueueNames.EMAIL)
@Injectable()
export class EmailWorker extends WorkerHost {
  private readonly logger = new Logger(
    EmailWorker.name,
  );

  constructor(
    private readonly emailService: EmailService,
    private readonly campaignRepo: CampaignRepository,
    @InjectQueue(QueueNames.DLQ)
    private readonly dlq: Queue,
    private readonly statsGateway: StatsGateway,
  ) {
    super();
  }

  async process(
    job: Job<EmailEventJob>,
  ): Promise<void> {
    const data = job.data;

    if (
      !data.toEmail ||
      !data.subject ||
      !data.htmlBody
    ) {
      throw new UnrecoverableError(
        `Job ${job.id}: missing required email fields`,
      );
    }

    await this.emailService.send({
      to: data.toEmail,
      toName: data.toName,
      subject: data.subject,
      html: data.htmlBody,
    });

    await this.campaignRepo.incrementSentCount(
      data.campaignId,
    );

    const campaign =
      await this.campaignRepo.findByIdInternal(
        data.campaignId,
      );
    if (
      campaign &&
      campaign.sentCount >=
        campaign.totalRecipients &&
      campaign.totalRecipients > 0
    ) {
      await this.campaignRepo.updateStatus(
        data.campaignId,
        data.organizationId,
        CampaignStatus.SENT,
      );
    }

    try {
      this.statsGateway.emitTenantEvent(
        data.organizationId,
        'email.sent',
        {
          campaignId: data.campaignId,
          subscriberId: data.subscriberId,
        },
      );
    } catch (err) {
      this.logger.warn(
        `WS emit failed: ${(err as Error).message}`,
      );
    }
  }

  @OnWorkerEvent('failed')
  async onFailed(
    job: Job<EmailEventJob>,
    err: Error,
  ): Promise<void> {
    this.logger.error(
      `Email job ${job.id} failed (attempt ${job.attemptsMade}): ${err.message}`,
    );

    if (
      job.attemptsMade >= (job.opts.attempts ?? 5)
    ) {
      try {
        await this.dlq.add('dlq.email', {
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
}
