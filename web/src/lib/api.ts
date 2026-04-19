import axios from 'axios';
import { apiBaseUrl } from '@/lib/config';

export const apiClient = axios.create({
  baseURL: `${apiBaseUrl}/api`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
});

// Attach JWT on every request
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global 401 handler
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

// ── Auth ──────────────────────────────────────────────────────────────────────

import type {
  RegisterRequest, LoginRequest, LoginResponse,
  ForgotPasswordRequest, ResetPasswordRequest,
} from '@/types';

export const authApi = {
  register: (data: RegisterRequest) =>
    apiClient.post('/auth/register', data),
  login: (data: LoginRequest) =>
    apiClient.post<LoginResponse>('/auth/login', data),
  forgotPassword: (data: ForgotPasswordRequest) =>
    apiClient.post('/auth/forgot-password', data),
  resetPassword: (data: ResetPasswordRequest) =>
    apiClient.post('/auth/reset-password', data),
};

// ── User ──────────────────────────────────────────────────────────────────────

import type { UserResponse, UpdateUserRequest } from '@/types';

export const userApi = {
  getMe: (id: string) =>
    apiClient.get<UserResponse>(`/users/${id}`),
  getAll: () =>
    apiClient.get<UserResponse[]>('/users'),
  update: (id: string, data: UpdateUserRequest) =>
    apiClient.put<UserResponse>(`/users/${id}`, data),
};

// ── Merchant ──────────────────────────────────────────────────────────────────

import type { CreateMerchantRequest, UpdateMerchantRequest, MerchantResponse } from '@/types';

export const merchantApi = {
  create: (data: CreateMerchantRequest) =>
    apiClient.post<MerchantResponse>('/merchants', data),
  getAll: () =>
    apiClient.get<MerchantResponse[]>('/merchants'),
  getByUser: (userId: string) =>
    apiClient.get<MerchantResponse[]>(`/merchants/by-user/${userId}`),
  getById: (id: string) =>
    apiClient.get<MerchantResponse>(`/merchants/${id}`),
  update: (id: string, data: UpdateMerchantRequest) =>
    apiClient.put<MerchantResponse>(`/merchants/${id}`, data),
  regenerateKey: (id: string) =>
    apiClient.post<MerchantResponse>(`/merchants/${id}/regenerate-key`),
};

// ── Envelope ──────────────────────────────────────────────────────────────────

import type {
  InitiateEnvelopeRequest, InitiateEnvelopeResponse, EnvelopeSignedResponse,
} from '@/types';

export const envelopeApi = {
  create: (apiKey: string, data: InitiateEnvelopeRequest) =>
    apiClient.post<InitiateEnvelopeResponse>('/envelopes', data, {
      headers: { 'X-Api-Key': apiKey },
    }),
  list: (apiKey: string) =>
    apiClient.get<InitiateEnvelopeResponse[]>('/envelopes', {
      headers: { 'X-Api-Key': apiKey },
    }),
  getById: (apiKey: string, id: string) =>
    apiClient.get<InitiateEnvelopeResponse>(`/envelopes/${id}`, {
      headers: { 'X-Api-Key': apiKey },
    }),
  getSignedDocuments: (apiKey: string, id: string) =>
    apiClient.get<EnvelopeSignedResponse>(`/envelopes/${id}/signed-documents`, {
      headers: { 'X-Api-Key': apiKey },
    }),
  cancel: (apiKey: string, id: string) =>
    apiClient.put(`/envelopes/${id}/cancel`, {}, {
      headers: { 'X-Api-Key': apiKey },
    }),
};

// ── Portal ────────────────────────────────────────────────────────────────────

import type { AnalyticsSummary, AnalyticsTrends, DocumentPreviewResponse, PlatformStats, SubmitSignatureRequest, RejectSignatureRequest, MyEnvelopeResponse } from '@/types';

export const portalApi = {
  validate: (token: string) =>
    apiClient.get<DocumentPreviewResponse>(`/portal/validate/${token}`),
  submit: (token: string, data: SubmitSignatureRequest) =>
    apiClient.post(`/portal/submit/${token}`, data),
  reject: (token: string, data: RejectSignatureRequest) =>
    apiClient.post(`/portal/reject/${token}`, data),
  getStats: () =>
    apiClient.get<PlatformStats>('/portal/stats'),
  getMyEnvelopes: () =>
    apiClient.get<MyEnvelopeResponse[]>('/portal/my-envelopes'),
};

// ── Analytics ─────────────────────────────────────────────────────────────────

export const analyticsApi = {
  getSummary: () =>
    apiClient.get<AnalyticsSummary>('/analytics/summary'),
  getTrends: (days = 30) =>
    apiClient.get<AnalyticsTrends>(`/analytics/trends?days=${days}`),
};

// ── Tickets ───────────────────────────────────────────────────────────────────

import type {
  CreateTicketRequest, AddTicketMessageRequest, UpdateTicketStatusRequest,
  TicketResponse, TicketSummary, TicketMessageResponse,
} from '@/types';

export const ticketsApi = {
  // User endpoints
  create: (data: CreateTicketRequest) =>
    apiClient.post<TicketResponse>('/tickets', data),
  getMy: () =>
    apiClient.get<TicketSummary[]>('/tickets/my'),
  getById: (id: string) =>
    apiClient.get<TicketResponse>(`/tickets/${id}`),
  addMessage: (id: string, data: AddTicketMessageRequest) =>
    apiClient.post<TicketMessageResponse>(`/tickets/${id}/message`, data),

  // Admin endpoints
  adminGetAll: () =>
    apiClient.get<TicketSummary[]>('/admin/tickets'),
  adminUpdateStatus: (id: string, data: UpdateTicketStatusRequest) =>
    apiClient.put(`/admin/tickets/${id}/status`, data),
};

// ── Audit Logs ────────────────────────────────────────────────────────────────

export interface AuditLogResponse {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  userId: string | null;
  merchantId: string | null;
  status: string;
  description: string;
  ipAddress: string;
  userAgent: string;
  metadata: string | null;
  timestamp: string;
}

export interface AuditPagedResult {
  items: AuditLogResponse[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AuditLogQueryParams {
  action?: string;
  entityType?: string;
  entityId?: string;
  userId?: string;
  merchantId?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export const auditApi = {
  getPaged: (params: AuditLogQueryParams = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') qs.set(k, String(v));
    });
    return apiClient.get<AuditPagedResult>(`/admin/audit-logs?${qs.toString()}`);
  },
  getByEntity: (entityType: string, entityId: string) =>
    apiClient.get<AuditLogResponse[]>(`/admin/audit-logs/entity/${entityType}/${entityId}`),
};
