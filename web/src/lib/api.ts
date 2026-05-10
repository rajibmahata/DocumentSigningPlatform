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

// ── Agent Manager Types ───────────────────────────────────────────────────────

export interface AgentDto {
  id: string;
  merchantId: string;
  agentName: string;
  agentType: string;
  parentAgentType?: string;
  description?: string;
  isEnabled: boolean;
  scheduleExpression?: string;
  timezone: string;
  approvalMode: string;
  maxRetries: number;
  configurationJson?: string;
  createdAt: string;
  updatedAt: string;
  statusSummary?: AgentStatusSummaryDto;
}

export interface AgentStatusSummaryDto {
  lastStatus: string;
  lastRunAt?: string;
  nextRunAt?: string;
  totalRuns: number;
  successRuns: number;
  failedRuns: number;
}

export interface AgentExecutionDto {
  id: string;
  agentId: string;
  agentName: string;
  executionStatus: string;
  startedAt: string;
  completedAt?: string;
  inputJson?: string;
  outputJson?: string;
  validationResultJson?: string;
  errorDetails?: string;
  retryCount: number;
  stepLogJson?: string;
  triggerType: string;
}

export interface AgentMemoryDto {
  id: string;
  agentId: string;
  contextType: string;
  contextKey: string;
  contextValue: string;
  updatedAt: string;
}

export interface CustomerInteractionDto {
  id: string;
  customerEmail: string;
  customerName?: string;
  interactionType: string;
  platform: string;
  message: string;
  aiInterpretation?: string;
  sentiment: string;
  nextRecommendedAction?: string;
  objectionType?: string;
  reEngageDaysDelay: number;
  createdAt: string;
}

export interface BlogSummaryDto {
  id: string;
  title: string;
  slug: string;
  category?: string;
  tags?: string;
  coverImageUrl?: string;
  status: string;
  publishedAt?: string;
  createdByAgent: string;
  viewCount: number;
  metaDescription?: string;
  createdAt: string;
}

export interface BlogDto extends BlogSummaryDto {
  content: string;
  keywords?: string;
  seoScore?: string;
  updatedAt: string;
}

// ── Agent Manager API ─────────────────────────────────────────────────────────

export const agentApi = {
  getAgents: () => apiClient.get<AgentDto[]>('/agent-manager'),
  getAgent: (id: string) => apiClient.get<AgentDto>(`/agent-manager/${id}`),
  createAgent: (data: Partial<AgentDto>) => apiClient.post<AgentDto>('/agent-manager', data),
  updateAgent: (id: string, data: Partial<AgentDto>) => apiClient.put(`/agent-manager/${id}`, data),
  deleteAgent: (id: string) => apiClient.delete(`/agent-manager/${id}`),
  toggleAgent: (id: string, enabled: boolean) => apiClient.patch(`/agent-manager/${id}/toggle?enabled=${enabled}`),
  executeAgent: (id: string, triggerType = 'manual') => apiClient.post(`/agent-manager/${id}/execute?triggerType=${triggerType}`),
  getExecutions: (id: string) => apiClient.get<AgentExecutionDto[]>(`/agent-manager/${id}/executions`),
  getAllExecutions: () => apiClient.get<AgentExecutionDto[]>('/agent-manager/executions'),
  retryExecution: (execId: string) => apiClient.post(`/agent-manager/executions/${execId}/retry`),
  getMemories: (id: string) => apiClient.get<AgentMemoryDto[]>(`/agent-manager/${id}/memories`),
  upsertMemory: (id: string, data: { contextType: string; contextKey: string; contextValue: string }) =>
    apiClient.post(`/agent-manager/${id}/memories`, data),
  approveExecution: (execId: string) => apiClient.post(`/agent-manager/executions/${execId}/approve`),
  cancelExecution: (execId: string) => apiClient.post(`/agent-manager/executions/${execId}/cancel`),
  getCustomerInteractions: (email?: string) =>
    apiClient.get<CustomerInteractionDto[]>(`/agent-manager/customer-interactions${email ? `?email=${email}` : ''}`),
  recordInteraction: (data: Partial<CustomerInteractionDto>) =>
    apiClient.post<CustomerInteractionDto>('/agent-manager/customer-interactions', data),
  deleteInteraction: (id: string) => apiClient.delete(`/agent-manager/customer-interactions/${id}`),
  // Presets
  getPresets: (category?: string) =>
    apiClient.get<AgentPresetDto[]>(`/agent-manager/presets${category ? `?category=${category}` : ''}`),
  getPreset: (presetId: string) => apiClient.get<AgentPresetDto>(`/agent-manager/presets/${presetId}`),
  provisionPreset: (presetId: string) =>
    apiClient.post<ProvisionedPresetDto>(`/agent-manager/presets/${presetId}/provision`),
};

// ── Agent Preset types ────────────────────────────────────────────────────────

export interface AgentPresetDto {
  presetId: string;
  category: string;
  agentType: string;
  name: string;
  description: string;
  icon: string;
  complexity: 'Simple' | 'Medium' | 'Complex';
  scheduleExpression: string;
  timezone: string;
  approvalMode: string;
  maxRetries: number;
  configurationJson: string;
  workflowStepsJson: string;
  tags: string[];
}

export interface ProvisionedPresetDto {
  agent: AgentDto;
  workflow: { id: string; agentId: string; workflowName: string; stepsJson: string; isEnabled: boolean; createdAt: string };
}



export const blogApi = {
  getBlogs: (params?: { status?: string; category?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.category) q.set('category', params.category);
    return apiClient.get<BlogSummaryDto[]>(`/blogs${q.toString() ? '?' + q.toString() : ''}`);
  },
  getBlog: (id: string) => apiClient.get<BlogDto>(`/blogs/${id}`),
  createBlog: (data: Partial<BlogDto>) => apiClient.post<BlogDto>('/blogs', data),
  updateBlog: (id: string, data: Partial<BlogDto>) => apiClient.put<BlogDto>(`/blogs/${id}`, data),
  deleteBlog: (id: string) => apiClient.delete(`/blogs/${id}`),
  publishBlog: (id: string) => apiClient.post<BlogDto>(`/blogs/${id}/publish`),
  unpublishBlog: (id: string) => apiClient.post<BlogDto>(`/blogs/${id}/unpublish`),
  generateBlog: (data: { topic: string; keywords?: string; targetAudience?: string; tone?: string }) =>
    apiClient.post<BlogDto>('/blogs/generate', data),
};

// ── Public Blog API (no auth required) ───────────────────────────────────────

export interface BlogCategoryDto { name: string; slug: string; postCount: number; }

export const publicBlogApi = {
  getBlogs: (params?: { category?: string; page?: number; pageSize?: number }) => {
    const q = new URLSearchParams();
    if (params?.category) q.set('category', params.category);
    if (params?.page) q.set('page', String(params.page));
    if (params?.pageSize) q.set('pageSize', String(params.pageSize));
    const qs = q.toString();
    return fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5163'}/api/public/blogs${qs ? '?' + qs : ''}`)
      .then(r => r.json() as Promise<BlogSummaryDto[]>);
  },
  getTrending: (count = 6) =>
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5163'}/api/public/blogs/trending?count=${count}`)
      .then(r => r.json() as Promise<BlogSummaryDto[]>),
  getCategories: () =>
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5163'}/api/public/blogs/categories`)
      .then(r => r.json() as Promise<BlogCategoryDto[]>),
  getBySlug: (slug: string) =>
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5163'}/api/public/blogs/${slug}`)
      .then(r => { if (!r.ok) return null; return r.json() as Promise<BlogDto>; }),
  getRelated: (slug: string, count = 4) =>
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5163'}/api/public/blogs/${slug}/related?count=${count}`)
      .then(r => r.json() as Promise<BlogSummaryDto[]>),
  trackView: (slug: string) =>
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5163'}/api/public/blogs/${slug}/view`, { method: 'POST' })
      .catch(() => {}),
};



export interface SocialAccountDto {
  id: string; platform: string; accountName: string; pageId: string;
  isActive: boolean; tokenExpiry?: string; createdAt: string;
}
export interface MarketingPostDto {
  id: string; platform: string; content: string; imageUrl?: string;
  status: string; scheduledAt?: string; publishedAt?: string;
  engagementScore: number; contentCategory: string; hashtags?: string;
  campaignId?: string; createdBy: string; createdAt: string;
}
export interface MarketingCampaignDto {
  id: string; name: string; description?: string; campaignType: string;
  status: string; startedAt?: string; endedAt?: string; createdAt: string;
}
export interface EngagementActivityDto {
  id: string; platform: string; activityType: string; userName?: string;
  message: string; response?: string; status: string; postId?: string; createdAt: string;
}
export interface MarketingAnalyticsDto {
  totalPosts: number; publishedPosts: number; scheduledPosts: number; draftPosts: number;
  totalEngagements: number; pendingReplies: number; activeCampaigns: number;
  avgEngagementScore: number;
  platformStats: { platform: string; posts: number; engagements: number }[];
  topPosts: MarketingPostDto[];
}
export interface GeneratePostResult {
  content: string; hashtags: string;
  suggestedCtas: string[]; engagementScore: number;
}

export const marketingApi = {
  // Social accounts
  getSocialAccounts: () =>
    apiClient.get<SocialAccountDto[]>('/marketing/social-accounts'),
  connectSocialAccount: (data: {
    platform: string; accountName: string; pageId: string;
    accessToken: string; refreshToken?: string; tokenExpiry?: string;
  }) => apiClient.post<SocialAccountDto>('/marketing/social-accounts', data),
  disconnectSocialAccount: (id: string) =>
    apiClient.delete(`/marketing/social-accounts/${id}`),

  // Posts
  getPosts: (params?: { status?: string; platform?: string }) =>
    apiClient.get<MarketingPostDto[]>('/marketing/posts', { params }),
  createPost: (data: {
    platform: string; content: string; contentCategory: string;
    hashtags?: string; imageUrl?: string; campaignId?: string; scheduledAt?: string;
  }) => apiClient.post<MarketingPostDto>('/marketing/posts', data),
  updatePostStatus: (id: string, status: string) =>
    apiClient.patch<MarketingPostDto>(`/marketing/posts/${id}/status`, JSON.stringify(status), {
      headers: { 'Content-Type': 'application/json' },
    }),
  deletePost: (id: string) =>
    apiClient.delete(`/marketing/posts/${id}`),

  // AI
  generatePost: (data: {
    platform: string; contentCategory: string;
    tone?: string; campaignContext?: string; includeHashtags?: boolean;
  }) => apiClient.post<GeneratePostResult>('/marketing/ai/generate-post', data),
  suggestReply: (message: string, platform: string) =>
    apiClient.post<{ reply: string }>('/marketing/ai/suggest-reply', { message, platform }),

  // Campaigns
  getCampaigns: () =>
    apiClient.get<MarketingCampaignDto[]>('/marketing/campaigns'),
  createCampaign: (data: { name: string; description?: string; campaignType: string }) =>
    apiClient.post<MarketingCampaignDto>('/marketing/campaigns', data),
  updateCampaignStatus: (id: string, status: string) =>
    apiClient.patch<MarketingCampaignDto>(`/marketing/campaigns/${id}/status`, JSON.stringify(status), {
      headers: { 'Content-Type': 'application/json' },
    }),

  // Engagements
  getEngagements: (params?: { status?: string }) =>
    apiClient.get<EngagementActivityDto[]>('/marketing/engagements', { params }),
  replyEngagement: (id: string, response: string) =>
    apiClient.post<EngagementActivityDto>(`/marketing/engagements/${id}/reply`, { response }),
  updateEngagementStatus: (id: string, status: string) =>
    apiClient.patch<EngagementActivityDto>(`/marketing/engagements/${id}/status`, JSON.stringify(status), {
      headers: { 'Content-Type': 'application/json' },
    }),

  // Analytics
  getAnalytics: () =>
    apiClient.get<MarketingAnalyticsDto>('/marketing/analytics'),
};
