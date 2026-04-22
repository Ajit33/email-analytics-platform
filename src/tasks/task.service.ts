// tasks/task.service.ts
import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { QueueProducerService } from '../queues/queue-producer.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(
    TasksService.name,
  );

  constructor(
    private readonly producer: QueueProducerService,
    private readonly config: ConfigService,
  ) {}

  @Cron('0 9 1 * *')
  async sendMonthlyReminder() {
    const orgId = this.config.get<string>(
      'DEFAULT_ORGANIZATION_ID',
    );
    if (!orgId) {
      this.logger.warn(
        'DEFAULT_ORGANIZATION_ID not set — skipping monthly reminder',
      );
      return;
    }

    const to = this.config.get<string>(
      'REPORT_REMINDER_TO',
      'admin@example.com',
    );

    try {
      await this.producer.enqueueEmailEvent({
        organizationId: orgId,
        campaignId: 'system-reminder',
        subscriberId: 'system',
        toEmail: to,
        toName: 'Admin',
        subject:
          'Reminder: collect subscriber report',
        htmlBody:
          '<p>Please collect the subscriber report within 3 days.</p>',
      });
      this.logger.log(
        `Monthly reminder queued for ${to}`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to queue monthly reminder: ${(err as Error).message}`,
      );
    }
  }
}
