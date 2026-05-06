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

// Global 401 handler — redirect to login on session expiry.
// Skip redirect for auth endpoints (login/register) and when already on /login.
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    const url: string = err.config?.url ?? '';
    const isAuthEndpoint = url.startsWith('/auth/');
    const isOnLoginPage  = typeof window !== 'undefined' && window.location.pathname === '/login';
    if (
      err.response?.status === 401 &&
      typeof window !== 'undefined' &&
      !isAuthEndpoint &&
      !isOnLoginPage
    ) {
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
  getPendingAdmins: () =>
    apiClient.get<UserResponse[]>('/admin/users/pending'),
  activate: (id: string) =>
    apiClient.post<UserResponse>(`/admin/users/${id}/activate`),
  deactivate: (id: string) =>
    apiClient.post<UserResponse>(`/admin/users/${id}/deactivate`),
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
  updateProfile: (id: string, data: { name: string; description?: string }) =>
    apiClient.put<MerchantResponse>(`/merchants/${id}/profile`, data),
  regenerateKey: (id: string) =>
    apiClient.post<MerchantResponse>(`/merchants/${id}/regenerate-key`),
  getNotificationSettings: (id: string) =>
    apiClient.get<{ reminderEnabled: boolean; reminderWindowHours: number }>(`/merchants/${id}/notification-settings`),
  updateNotificationSettings: (id: string, data: { reminderEnabled: boolean; reminderWindowHours: number }) =>
    apiClient.put<{ reminderEnabled: boolean; reminderWindowHours: number }>(`/merchants/${id}/notification-settings`, data),
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
  resendInvitation: (apiKey: string, id: string, signerEmail: string) =>
    apiClient.post(`/envelopes/${id}/resend`, { signerEmail }, {
      headers: { 'X-Api-Key': apiKey },
    }),
  getActivity: (apiKey: string, id: string) =>
    apiClient.get<import('@/types').EnvelopeActivityItem[]>(`/envelopes/${id}/activity`, {
      headers: { 'X-Api-Key': apiKey },
    }),
  downloadDocument: (apiKey: string, envelopeId: string, docId: string) =>
    apiClient.get<Blob>(`/envelopes/${envelopeId}/documents/${docId}/download`, {
      headers: { 'X-Api-Key': apiKey },
      responseType: 'blob',
    }),
  downloadCertificate: (apiKey: string, envelopeId: string) =>
    apiClient.get<Blob>(`/envelopes/${envelopeId}/certificate`, {
      headers: { 'X-Api-Key': apiKey },
      responseType: 'blob',
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
  search?: string;
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

  /** Current user's own audit log (JWT auth, no admin needed) */
  getMyLogs: (params: AuditLogQueryParams = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') qs.set(k, String(v));
    });
    return apiClient.get<AuditPagedResult>(`/audit-logs/me?${qs.toString()}`);
  },

  /** Merchant audit log — requires X-Api-Key header */
  getMerchantLogs: (apiKey: string, params: AuditLogQueryParams = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') qs.set(k, String(v));
    });
    return apiClient.get<AuditPagedResult>(`/audit-logs/merchant?${qs.toString()}`, {
      headers: { 'X-Api-Key': apiKey },
    });
  },
};

// ── Webhook API ───────────────────────────────────────────────────────────────
import type {
  CreateWebhookRequest,
  WebhookResponse,
  WebhookDeliveryPagedResult,
} from '@/types';

export interface WebhookTestResult {
  success: boolean;
  statusCode: number;
  durationMs: number;
  body: string;
}

export const webhookApi = {
  create: (data: CreateWebhookRequest) =>
    apiClient.post<WebhookResponse>('/webhooks', data),

  getByMerchant: (merchantId: string) =>
    apiClient.get<WebhookResponse[]>(`/webhooks?merchantId=${merchantId}`),

  delete: (id: string) =>
    apiClient.delete(`/webhooks/${id}`),

  getDeliveries: (id: string, page = 1, pageSize = 20) =>
    apiClient.get<WebhookDeliveryPagedResult>(
      `/webhooks/${id}/deliveries?page=${page}&pageSize=${pageSize}`
    ),

  test: (id: string) =>
    apiClient.post<WebhookTestResult>(`/webhooks/${id}/test`),
};

// ── Signer Contacts ───────────────────────────────────────────────────────────

import type {
  SignerContactResponse,
  CreateSignerContactRequest,
  UpdateSignerContactRequest,
  SignerContactImportResult,
} from '@/types';

export const signerContactApi = {
  list: () =>
    apiClient.get<SignerContactResponse[]>('/signer-contacts'),

  search: (query: string) =>
    apiClient.get<SignerContactResponse[]>(`/signer-contacts/search?query=${encodeURIComponent(query)}`),

  create: (data: CreateSignerContactRequest) =>
    apiClient.post<SignerContactResponse>('/signer-contacts', data),

  update: (id: string, data: UpdateSignerContactRequest) =>
    apiClient.put<SignerContactResponse>(`/signer-contacts/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/signer-contacts/${id}`),

  importCsv: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiClient.post<SignerContactImportResult>('/signer-contacts/import', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  exportCsv: () =>
    apiClient.get('/signer-contacts/export', { responseType: 'blob' }),
};

export const plansApi = {
  getAll: () =>
    apiClient.get<SubscriptionPlan[]>('/plans'),

  assignToMerchant: (merchantId: string, planName: string, subscriptionEnd?: string) =>
    apiClient.post(`/merchants/${merchantId}/plan`, { planName, subscriptionEnd }),
};

export interface SupportContact {
  name: string;
  email: string;
}

export const supportApi = {
  getContacts: () => apiClient.get<SupportContact[]>('/support-contacts'),
};

export interface SubscriptionPlan {
  name: string;
  displayName: string;
  description: string;
  requestLimit: number;
  priceMonthly: number;
  isPopular: boolean;
  features: string[];
}

// ── Document Templates ────────────────────────────────────────────────────────

export interface TemplateSigner {
  name: string;
  email: string;
  role: string;
  order: number;
  message?: string;
}

export interface TemplateResponse {
  id: string;
  merchantId: string;
  name: string;
  description?: string;
  defaultTitle: string;
  signers: TemplateSigner[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateRequest {
  name: string;
  description?: string;
  defaultTitle: string;
  signers: TemplateSigner[];
}

export const templatesApi = {
  list: () =>
    apiClient.get<TemplateResponse[]>('/templates'),

  getById: (id: string) =>
    apiClient.get<TemplateResponse>(`/templates/${id}`),

  create: (data: CreateTemplateRequest) =>
    apiClient.post<TemplateResponse>('/templates', data),

  update: (id: string, data: CreateTemplateRequest) =>
    apiClient.put<TemplateResponse>(`/templates/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/templates/${id}`),
};

// ── Notifications ─────────────────────────────────────────────────────────────

export interface NotificationDto {
  id: string;
  title: string;
  body: string;
  type: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationSummaryDto {
  unreadCount: number;
  recent: NotificationDto[];
}

export const notificationsApi = {
  getSummary: () =>
    apiClient.get<NotificationSummaryDto>('/notifications'),

  markAllRead: () =>
    apiClient.post('/notifications/read-all'),

  markRead: (id: string) =>
    apiClient.post(`/notifications/${id}/read`),
};

// ── Workflow Engine ───────────────────────────────────────────────────────────

export interface WorkflowSummaryDto {
  id: string;
  name: string;
  description?: string;
  version: number;
  status: 'Draft' | 'Published' | 'Archived';
  isTemplate: boolean;
  category?: string;
  instanceCount: number;
  updatedAt: string;
}

export interface WorkflowDefinitionDto extends WorkflowSummaryDto {
  merchantId: string;
  jsonDefinition: string;
  templatName?: string;
  createdBy?: string;
  createdAt: string;
}

export interface NodeExecutionDto {
  id: string;
  nodeId: string;
  nodeType: string;
  nodeLabel: string;
  status: 'Pending' | 'Running' | 'Completed' | 'Failed' | 'Skipped';
  outputJson?: string;
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
}

export interface WorkflowInstanceDto {
  id: string;
  workflowDefinitionId: string;
  workflowName: string;
  status: 'Running' | 'Paused' | 'Completed' | 'Failed' | 'Cancelled';
  currentNodeId?: string;
  envelopeId?: string;
  triggeredBy?: string;
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
  nodeExecutions: NodeExecutionDto[];
}

export interface WorkflowStatsDto {
  totalWorkflows: number;
  publishedWorkflows: number;
  runningInstances: number;
  completedInstances: number;
  failedInstances: number;
}

export interface CreateWorkflowRequest {
  name: string;
  description?: string;
  category?: string;
  jsonDefinition?: string;
}

export interface UpdateWorkflowRequest {
  name: string;
  description?: string;
  category?: string;
  jsonDefinition: string;
}

export const workflowApi = {
  list: () =>
    apiClient.get<WorkflowSummaryDto[]>('/workflows'),

  listTemplates: () =>
    apiClient.get<WorkflowSummaryDto[]>('/workflows/templates'),

  getById: (id: string) =>
    apiClient.get<WorkflowDefinitionDto>(`/workflows/${id}`),

  create: (data: CreateWorkflowRequest) =>
    apiClient.post<WorkflowDefinitionDto>('/workflows', data),

  update: (id: string, data: UpdateWorkflowRequest) =>
    apiClient.put<WorkflowDefinitionDto>(`/workflows/${id}`, data),

  publish: (id: string) =>
    apiClient.post(`/workflows/${id}/publish`),

  delete: (id: string) =>
    apiClient.delete(`/workflows/${id}`),

  cloneTemplate: (templateId: string) =>
    apiClient.post<WorkflowDefinitionDto>(`/workflows/clone/${templateId}`),

  trigger: (id: string, data: { envelopeId?: string; contextJson?: string }) =>
    apiClient.post<WorkflowInstanceDto>(`/workflows/${id}/trigger`, data),

  getInstances: (id: string) =>
    apiClient.get<WorkflowInstanceDto[]>(`/workflows/${id}/instances`),

  listAllInstances: () =>
    apiClient.get<WorkflowInstanceDto[]>('/workflows/instances'),

  getInstance: (instanceId: string) =>
    apiClient.get<WorkflowInstanceDto>(`/workflows/instances/${instanceId}`),

  cancelInstance: (instanceId: string) =>
    apiClient.post(`/workflows/instances/${instanceId}/cancel`),

  getStats: () =>
    apiClient.get<WorkflowStatsDto>('/workflows/stats'),
};
