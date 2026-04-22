// queues/queues.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QueueNames } from './queue.constants';
import { QueueProducerService } from './queue-producer.service';
import { QueuesController } from './queues.controller';
import { AutomationWorker } from './processors/automation-events.processor';
import { QueueCircuitBreakerService } from './queue-circuit-breaker.service';
import { FallbackQueue } from './fallback/fallback.queue';
import { FallbackRetryService } from './fallback/fallback.retry';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: QueueNames.CLICK },
      { name: QueueNames.EMAIL },
      { name: QueueNames.AUTOMATION },
      { name: QueueNames.DLQ },
    ),
  ],
  controllers: [QueuesController],
  providers: [
    QueueProducerService,
    AutomationWorker,
    QueueCircuitBreakerService,
    FallbackQueue,
    FallbackRetryService,
  ],
  exports: [QueueProducerService, BullModule],
})
export class QueuesModule {}
