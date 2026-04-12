import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5163';

export const apiClient = axios.create({
  baseURL: `${BASE_URL}/api`,
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
  update: (id: string, data: UpdateUserRequest) =>
    apiClient.put<UserResponse>(`/users/${id}`, data),
};

// ── Merchant ──────────────────────────────────────────────────────────────────

import type { CreateMerchantRequest, MerchantResponse } from '@/types';

export const merchantApi = {
  create: (data: CreateMerchantRequest) =>
    apiClient.post<MerchantResponse>('/merchants', data),
  getByUser: (userId: string) =>
    apiClient.get<MerchantResponse[]>(`/merchants/by-user/${userId}`),
  getById: (id: string) =>
    apiClient.get<MerchantResponse>(`/merchants/${id}`),
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
    apiClient.get<EnvelopeSignedResponse>(`/envelopes/${id}`, {
      headers: { 'X-Api-Key': apiKey },
    }),
};

// ── Portal ────────────────────────────────────────────────────────────────────

import type { DocumentPreviewResponse, SubmitSignatureRequest } from '@/types';

export const portalApi = {
  validate: (token: string) =>
    apiClient.get<DocumentPreviewResponse>(`/portal/validate/${token}`),
  submit: (token: string, data: SubmitSignatureRequest) =>
    apiClient.post(`/portal/submit/${token}`, data),
};
