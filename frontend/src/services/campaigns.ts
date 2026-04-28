import api from '../lib/api';

export interface Campaign {
  id: string;
  name: string;
  subject: string;
  body: string;
  targetUrl?: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignStats {
  campaign: Campaign;
  totalSent: number;
  totalOpens: number;
  totalClicks: number;
  openRate: number;
  clickRate: number;
}

export const campaignsService = {
  getAll: async () => {
    const { data } = await api.get<Campaign[]>('/campaigns');
    return data;
  },

  getById: async (id: string) => {
    const { data } = await api.get<Campaign>(`/campaigns/${id}`);
    return data;
  },

  create: async (campaign: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt' | 'organizationId'>) => {
    const { data } = await api.post<Campaign>('/campaigns', campaign);
    return data;
  },

  send: async (id: string) => {
    const { data } = await api.post<{ queued: number }>('/campaigns/:id/send', {}, {
      params: { id },
    });
    return data;
  },

  getStats: async (campaignId: string) => {
    const { data } = await api.get<CampaignStats>(`/click-stats/campaign/${campaignId}`);
    return data;
  },
};
