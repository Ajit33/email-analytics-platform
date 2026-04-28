import api from '../lib/api';

export interface MailingList {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  subscriberCount?: number;
}

export const listsService = {
  getAll: async () => {
    const { data } = await api.get<MailingList[]>('/lists');
    return data;
  },

  getById: async (id: string) => {
    const { data } = await api.get<MailingList>(`/lists/${id}`);
    return data;
  },

  create: async (list: Omit<MailingList, 'id' | 'createdAt' | 'updatedAt' | 'organizationId'>) => {
    const { data } = await api.post<MailingList>('/lists', list);
    return data;
  },

  update: async (id: string, updates: Partial<MailingList>) => {
    const { data } = await api.patch<MailingList>(`/lists/${id}`, updates);
    return data;
  },

  remove: async (id: string) => {
    await api.delete(`/lists/${id}`);
  },

  importCsv: async (listId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post(`/lists/${listId}/import-csv`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
};
