// tasks/task.module.ts
import { Module } from '@nestjs/common';
import { TasksService } from './task.service';
import { QueuesModule } from '../queues/queues.module';

@Module({
  imports: [QueuesModule],
  providers: [TasksService],
})
export class TasksModule {}
