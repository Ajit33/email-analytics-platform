// queues/queue-jobs.types.ts
export interface ClickEventJob {
  campaignId: string;
  subscriberId: string;
  linkId: string;
  originalUrl?: string;
  ipAddress: string;
  userAgent: string;
  eventType: 'click' | 'open';
  occurredAt: string;
  // These are resolved by the worker from the campaign record,
  // not available at queue-push time from tracking tokens
  organizationId?: string;
  listId?: string;
}

export interface EmailEventJob {
  organizationId: string;
  campaignId: string;
  subscriberId: string;
  toEmail: string;
  toName: string;
  subject: string;
  htmlBody: string;
}

export interface AutomationEventJob {
  triggerId: string;
  organizationId: string;
  eventType: string;
  payload: Record<string, unknown>;
}
