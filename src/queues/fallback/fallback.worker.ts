import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PendingJob } from './pending-job.entity';
import { LessThan, Repository } from 'typeorm';
import { Queue } from 'bullmq';
import { Interval } from '@nestjs/schedule';
import { QueueCircuitBreakerService } from '../queue-circuit-breaker.service';
@Injectable()
export class FallbackWorker {
  constructor(
    @InjectRepository(PendingJob)
    private repo: Repository<PendingJob>,

    @InjectQueue('email-events')
    private emailQueue: Queue,

    @InjectQueue('click-events')
    private clickQueue: Queue,

    private circuitBreaker: QueueCircuitBreakerService,
  ) {}

  @Interval(5000)
  async retry() {
    if (this.circuitBreaker.getState() === 'OPEN')
      return;

    const jobs = await this.repo.find({
      where: {
        status: 'pending',
        nextRetryAt: LessThan(new Date()),
      },
      take: 20,
    });

    for (const job of jobs) {
      try {
        const queue =
          job.type === 'email'
            ? this.emailQueue
            : this.clickQueue;

        await queue.add(job.type, job.payload, {
          jobId: job.jobId,
        });

        job.status = 'done';
        await this.repo.save(job);
      } catch {
        job.retryCount++;
        job.nextRetryAt = new Date(
          Date.now() +
            Math.pow(2, job.retryCount) * 1000,
        );
        await this.repo.save(job);
      }
    }
  }
}
