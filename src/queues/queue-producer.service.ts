// queues/queue-producer.service.ts
import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QueueNames } from './queue.constants';
import {
  DEFAULT_JOB_OPTIONS,
  EMAIL_JOB_OPTIONS,
} from './queue.config';
import {
  ClickEventJob,
  EmailEventJob,
  AutomationEventJob,
} from './queue-jobs.types';
import { QueueCircuitBreakerService } from './queue-circuit-breaker.service';
import { FallbackQueue } from './fallback/fallback.queue';

@Injectable()
export class QueueProducerService {
  private readonly logger = new Logger(
    QueueProducerService.name,
  );

  constructor(
    @InjectQueue(QueueNames.CLICK)
    private readonly clickQueue: Queue,
    @InjectQueue(QueueNames.EMAIL)
    private readonly emailQueue: Queue,
    @InjectQueue(QueueNames.AUTOMATION)
    private readonly automationQueue: Queue,
    private readonly circuitBreaker: QueueCircuitBreakerService,
    private readonly fallbackQueue: FallbackQueue,
  ) {}

  async enqueueClickEvent(
    data: ClickEventJob,
  ): Promise<void> {
    const jobId = `${data.campaignId}-${data.subscriberId}-${data.linkId}-${data.occurredAt}`;

    try {
      await this.clickQueue.add(
        'track-click',
        data,
        {
          ...DEFAULT_JOB_OPTIONS,
          jobId,
          priority: 1,
        },
      );
    } catch (err) {
      this.logger.error(
        `Click enqueue failed — campaign: ${data.campaignId}: ${(err as Error).message}`,
      );
      throw err;
    }
  }

  async enqueueEmailEvent(
    data: EmailEventJob,
  ): Promise<void> {
    const jobId = `${data.campaignId}-${data.subscriberId}`;

    try {
      await this.circuitBreaker.execute(
        () =>
          this.emailQueue.add(
            'send-email',
            data,
            {
              ...EMAIL_JOB_OPTIONS,
              jobId,
            },
          ),
        () => {
          this.fallbackQueue.add({
            jobId,
            type: 'email',
            name: 'send-email',
            payload: data,
          });
          return null;
        },
      );
    } catch (err) {
      this.logger.error(
        `Email enqueue failed — campaign: ${data.campaignId}: ${(err as Error).message}`,
      );
      throw err;
    }
  }

  async enqueueAutomationEvent(
    data: AutomationEventJob,
  ): Promise<void> {
    try {
      await this.automationQueue.add(
        'automation-trigger',
        data,
        {
          ...DEFAULT_JOB_OPTIONS,
          jobId: crypto.randomUUID(),
        },
      );
    } catch (err) {
      this.logger.error(
        `Automation enqueue failed — trigger: ${data.triggerId}: ${(err as Error).message}`,
      );
      throw err;
    }
  }
}
