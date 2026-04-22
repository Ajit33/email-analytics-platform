import { Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QueueNames } from '../queue.constants';
import { FallbackQueue } from './fallback.queue';
import { QueueCircuitBreakerService } from '../queue-circuit-breaker.service';

@Injectable()
export class FallbackRetryService {
  constructor(
    private fallbackQueue: FallbackQueue,
    private circuitBreaker: QueueCircuitBreakerService,

    @InjectQueue(QueueNames.EMAIL)
    private emailQueue: Queue,

    @InjectQueue(QueueNames.CLICK)
    private clickQueue: Queue,

    @InjectQueue(QueueNames.AUTOMATION)
    private automationQueue: Queue,
  ) {}

  @Interval(5000)
  async retry() {
    if (this.circuitBreaker.getState() === 'OPEN')
      return;

    const jobs = this.fallbackQueue.getAll();
    const processed = new Set<string>();

    for (const job of jobs) {
      try {
        const queue =
          job.type === 'email'
            ? this.emailQueue
            : job.type === 'click'
              ? this.clickQueue
              : this.automationQueue;

        await queue.add(job.name, job.payload, {
          jobId: job.jobId,
        });

        processed.add(job.jobId);
      } catch {
        // retry later
      }
    }

    this.fallbackQueue.remove(processed);
  }
}
