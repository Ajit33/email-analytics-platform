// queues/queue.constants.ts
export const QueueNames = {
  EMAIL: 'email-events',
  CLICK: 'click-events',
  AUTOMATION: 'automation-events',
  DLQ: 'dead-letter-events',
} as const;

export type QueueName =
  (typeof QueueNames)[keyof typeof QueueNames];
