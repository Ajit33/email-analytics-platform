import api from '../lib/api';

export interface ClickEvent {
  id: string;
  linkId: string;
  subscriberId?: string;
  campaignId: string;
  ipAddress: string;
  userAgent: string;
  country?: string;
  city?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  clickedAt: string;
}

export interface CampaignClickStats {
  campaignId: string;
  totalClicks: number;
  uniqueClicks: number;
  clicksByCountry: Record<string, number>;
  clicksByDevice: Record<string, number>;
  clicksByDay: Record<string, number>;
}

export const clickStatsService = {
  getEvents: async () => {
    const { data } = await api.get<ClickEvent[]>('/click-stats');
    return data;
  },

  getCampaignStats: async (campaignId: string) => {
    const { data } = await api.get<CampaignClickStats>(`/click-stats/campaign/${campaignId}`);
    return data;
  },
};
