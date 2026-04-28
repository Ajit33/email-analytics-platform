import api from '../lib/api';

export interface Subscriber {
  id: string;
  email: string;
  name: string;
  status: 'active' | 'unsubscribed' | 'bounced';
  listId: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriberStats {
  total: number;
  active: number;
  unsubscribed: number;
  bounced: number;
}

export const subscribersService = {
  getAll: async (page = 1, limit = 10) => {
    const { data } = await api.get<{ subscribers: Subscriber[]; total: number }>('/subscribers', {
      params: { page, limit },
    });
    return data;
  },

  getById: async (id: string) => {
    const { data } = await api.get<Subscriber>(`/subscribers/${id}`);
    return data;
  },

  create: async (subscriber: Omit<Subscriber, 'id' | 'createdAt' | 'updatedAt' | 'organizationId'>) => {
    const { data } = await api.post<Subscriber>('/subscribers', subscriber);
    return data;
  },

  update: async (id: string, updates: Partial<Subscriber>) => {
    const { data } = await api.patch<Subscriber>(`/subscribers/${id}`, updates);
    return data;
  },

  unsubscribe: async (id: string) => {
    const { data } = await api.patch<Subscriber>(`/subscribers/${id}/unsubscribe`);
    return data;
  },

  resubscribe: async (id: string) => {
    const { data } = await api.patch<Subscriber>(`/subscribers/${id}/resubscribe`);
    return data;
  },

  remove: async (id: string) => {
    await api.delete(`/subscribers/${id}`);
  },

  getStats: async () => {
    const { data } = await api.get<SubscriberStats>('/subscribers/stats');
    return data;
  },
};
