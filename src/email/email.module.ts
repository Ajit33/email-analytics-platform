// email/email.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';
import { EmailWorker } from './email.worker';
import { QueuesModule } from '../queues/queues.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { CampaignsModule } from '../campaigns/campaigns.module';

@Module({
  imports: [
    ConfigModule,
    QueuesModule,
    RealtimeModule,
    CampaignsModule,
  ],
  providers: [EmailService, EmailWorker],
  exports: [EmailService],
})
export class EmailModule {}
