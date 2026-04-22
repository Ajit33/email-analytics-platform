// queues/queue.config.ts
import { JobsOptions } from 'bullmq';

export const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000,
  },
  removeOnComplete: { count: 500 },
  removeOnFail: { count: 1000 },
};

export const EMAIL_JOB_OPTIONS: JobsOptions = {
  ...DEFAULT_JOB_OPTIONS,
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 5000,
  },
};
