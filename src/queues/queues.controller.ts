// queues/queues.controller.ts
import {
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/role.decorator';
import { QueueNames } from './queue.constants';
import { QueueCircuitBreakerService } from './queue-circuit-breaker.service';
import { FallbackQueue } from './fallback/fallback.queue';

@Controller('queues')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class QueuesController {
  constructor(
    @InjectQueue(QueueNames.CLICK)
    private readonly clickQueue: Queue,
    @InjectQueue(QueueNames.EMAIL)
    private readonly emailQueue: Queue,
    @InjectQueue(QueueNames.AUTOMATION)
    private readonly automationQueue: Queue,
    @InjectQueue(QueueNames.DLQ)
    private readonly dlqQueue: Queue,
    private readonly circuitBreaker: QueueCircuitBreakerService,
    private readonly fallbackQueue: FallbackQueue,
  ) {}

  @Get('health')
  async getHealth() {
    const [click, email, automation, dlq] =
      await Promise.all([
        this.getQueueStats(this.clickQueue),
        this.getQueueStats(this.emailQueue),
        this.getQueueStats(this.automationQueue),
        this.getQueueStats(this.dlqQueue),
      ]);

    return {
      circuitBreaker:
        this.circuitBreaker.getMetrics(),
      fallbackQueueSize:
        this.fallbackQueue.size(),
      email,
      click,
      automation,
      dlq,
    };
  }

  private async getQueueStats(queue: Queue) {
    const [
      waiting,
      active,
      completed,
      failed,
      delayed,
    ] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return {
      name: queue.name,
      waiting,
      active,
      completed,
      failed,
      delayed,
    };
  }
}
