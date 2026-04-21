// campaigns/campaigns.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Campaign } from './entities/campaign.entity';
import { CampaignController } from './campaigns.controller';
import { CampaignService } from './campaigns.service';
import { CampaignRepository } from './campaign.repository';
import { ClickStatsModule } from '../click_stats/click_stats.module';
import { SubscribersModule } from '../subscribers/subscribers.module';
import { QueuesModule } from '../queues/queues.module';
import { SecurityModule } from '../security/security.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Campaign]),
    ConfigModule,
    ClickStatsModule,
    SubscribersModule,
    QueuesModule,
    SecurityModule,
  ],
  controllers: [CampaignController],
  providers: [
    CampaignService,
    CampaignRepository,
  ],
  exports: [CampaignService, CampaignRepository],
})
export class CampaignsModule {}
