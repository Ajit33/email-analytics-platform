import { Injectable } from '@nestjs/common';

@Injectable()
export class FallbackQueue {
  private jobs: any[] = [];

  add(job: any) {
    this.jobs.push(job);
  }

  getAll() {
    return this.jobs;
  }

  remove(jobIds: Set<string>) {
    this.jobs = this.jobs.filter(
      (j) => !jobIds.has(j.jobId),
    );
  }

  size() {
    return this.jobs.length;
  }
}
