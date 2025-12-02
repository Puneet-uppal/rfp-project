import axios from 'axios';
import type { Rfp, Vendor, Proposal, ComparisonResult } from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// RFP API
export const rfpApi = {
  parseNaturalLanguage: async (input: string): Promise<Rfp> => {
    const { data } = await api.post('/rfps/parse', { input });
    return data;
  },

  create: async (rfp: Partial<Rfp>): Promise<Rfp> => {
    const { data } = await api.post('/rfps', rfp);
    return data;
  },

  getAll: async (params?: { status?: string; search?: string; page?: number; limit?: number }) => {
    const { data } = await api.get<{ rfps: Rfp[]; total: number }>('/rfps', { params });
    return data;
  },

  getById: async (id: string): Promise<Rfp> => {
    const { data } = await api.get(`/rfps/${id}`);
    return data;
  },

  update: async (id: string, rfp: Partial<Rfp>): Promise<Rfp> => {
    const { data } = await api.patch(`/rfps/${id}`, rfp);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/rfps/${id}`);
  },

  sendToVendors: async (id: string, vendorIds: string[], customSubject?: string, customBody?: string) => {
    const { data } = await api.post(`/rfps/${id}/send`, { vendorIds, customSubject, customBody });
    return data;
  },

  addVendor: async (rfpId: string, vendorId: string) => {
    const { data } = await api.post(`/rfps/${rfpId}/vendors/${vendorId}`);
    return data;
  },

  removeVendor: async (rfpId: string, vendorId: string): Promise<void> => {
    await api.delete(`/rfps/${rfpId}/vendors/${vendorId}`);
  },

  updateStatus: async (id: string, status: string): Promise<Rfp> => {
    const { data } = await api.patch(`/rfps/${id}/status`, { status });
    return data;
  },
};

// Vendor API
export const vendorApi = {
  getAll: async (params?: { search?: string; category?: string; isActive?: boolean; page?: number; limit?: number }) => {
    const { data } = await api.get<{ vendors: Vendor[]; total: number }>('/vendors', { params });
    return data;
  },

  getById: async (id: string): Promise<Vendor> => {
    const { data } = await api.get(`/vendors/${id}`);
    return data;
  },

  create: async (vendor: Partial<Vendor>): Promise<Vendor> => {
    const { data } = await api.post('/vendors', vendor);
    return data;
  },

  update: async (id: string, vendor: Partial<Vendor>): Promise<Vendor> => {
    const { data } = await api.patch(`/vendors/${id}`, vendor);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/vendors/${id}`);
  },

  getCategories: async (): Promise<string[]> => {
    const { data } = await api.get('/vendors/categories');
    return data;
  },
};

// Proposal API
export const proposalApi = {
  getByRfp: async (rfpId: string): Promise<Proposal[]> => {
    const { data } = await api.get(`/proposals/rfp/${rfpId}`);
    return data;
  },

  getById: async (id: string): Promise<Proposal> => {
    const { data } = await api.get(`/proposals/${id}`);
    return data;
  },

  createManual: async (rfpId: string, vendorId: string, proposalData: Partial<Proposal>): Promise<Proposal> => {
    const { data } = await api.post('/proposals/manual', { rfpId, vendorId, ...proposalData });
    return data;
  },

  reparse: async (id: string): Promise<Proposal> => {
    const { data } = await api.post(`/proposals/${id}/reparse`);
    return data;
  },

  selectWinner: async (id: string): Promise<Proposal> => {
    const { data } = await api.post(`/proposals/${id}/select`);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/proposals/${id}`);
  },
};

// Comparison API
export const comparisonApi = {
  compare: async (rfpId: string): Promise<ComparisonResult> => {
    const { data } = await api.get(`/comparison/${rfpId}`);
    return data;
  },

  getRecommendation: async (rfpId: string, priorities?: string[]) => {
    const { data } = await api.post(`/comparison/${rfpId}/recommend`, { priorities });
    return data;
  },

  getFullComparison: async (rfpId: string, priorities?: string[]): Promise<ComparisonResult> => {
    const { data } = await api.post(`/comparison/${rfpId}/full`, { priorities });
    return data;
  },
};

// Email API
export const emailApi = {
  getStatus: async () => {
    const { data } = await api.get('/email/status');
    return data;
  },

  fetchEmails: async () => {
    const { data } = await api.post('/email/fetch');
    return data;
  },

  startPolling: async () => {
    const { data } = await api.post('/email/polling/start');
    return data;
  },

  stopPolling: async () => {
    const { data } = await api.post('/email/polling/stop');
    return data;
  },
};

export default api;

