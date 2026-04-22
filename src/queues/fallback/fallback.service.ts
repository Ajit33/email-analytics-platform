import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PendingJob } from './pending-job.entity';

@Injectable()
export class FallbackService {
  constructor(
    @InjectRepository(PendingJob)
    private repo: Repository<PendingJob>,
  ) {}

  async store(job: {
    jobId: string;
    type: string;
    payload: any;
  }) {
    await this.repo.save({
      ...job,
      nextRetryAt: new Date(),
    });
  }
}
