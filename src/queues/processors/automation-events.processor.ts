// queues/processors/automation-events.processor.ts
import {
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  Processor,
  WorkerHost,
} from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { QueueNames } from '../queue.constants';
import { AutomationEventJob } from '../queue-jobs.types';

@Processor(QueueNames.AUTOMATION)
@Injectable()
export class AutomationWorker extends WorkerHost {
  private readonly logger = new Logger(
    AutomationWorker.name,
  );

  async process(
    job: Job<AutomationEventJob>,
  ): Promise<void> {
    this.logger.log(
      `Processing automation trigger: ${job.data.triggerId} for org: ${job.data.organizationId}`,
    );
  }
}
