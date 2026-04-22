// click-stats/click-stats.module.ts
import {
  Module,
  forwardRef,
} from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClickEvent } from './entities/click_event.entity';
import { Link } from './entities/link.entity';
import { ClickStatsController } from './click_stats.controller';
import { ClickStatsService } from './click_stats.service';
import { ClickEventRepository } from './click-event.repository';
import { LinkRepository } from './link.repository';
import { ClickWorker } from './click.worker';
import { SecurityModule } from '../security/security.module';
import { QueuesModule } from '../queues/queues.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { CampaignsModule } from '../campaigns/campaigns.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ClickEvent, Link]),
    SecurityModule,
    QueuesModule,
    RealtimeModule,
    forwardRef(() => CampaignsModule),
  ],
  controllers: [ClickStatsController],
  providers: [
    ClickStatsService,
    ClickEventRepository,
    LinkRepository,
    ClickWorker,
  ],
  exports: [ClickStatsService, LinkRepository],
})
export class ClickStatsModule {}
