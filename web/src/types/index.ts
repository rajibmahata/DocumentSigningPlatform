// ── Auth ──────────────────────────────────────────────────────────────────────

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  country?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  isEmailVerified: boolean;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

// ── User ──────────────────────────────────────────────────────────────────────

export type AccessRole = 'User' | 'Admin' | 'Viewer';

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  country?: string;
  isEmailVerified: boolean;
  accessRole: AccessRole;
  createdAt: string;
}

export interface UpdateUserRequest {
  name?: string;
}

// ── Merchant ──────────────────────────────────────────────────────────────────

export interface CreateMerchantRequest {
  userId: string;
  name: string;
  description?: string;
  requestLimit?: number;
}

export interface MerchantResponse {
  id: string;
  userId: string;
  name: string;
  description?: string;
  apiKey: string;
  isActive: boolean;
  requestLimit: number;
  requestUsed: number;
  subscriptionStart: string;
  subscriptionEnd?: string;
  createdAt: string;
}

// ── Envelope ──────────────────────────────────────────────────────────────────

export interface DocumentInput {
  documentTitle: string;
  documentFileName: string;
  documentBase64: string;
  documentContentType?: string;
}

export interface SignerInput {
  name: string;
  email: string;
  role: string;
  order: number;
  message: string;
}

export interface InitiateEnvelopeRequest {
  title: string;
  merchantId: string;
  documents: DocumentInput[];
  signers: SignerInput[];
}

export interface DocumentSummary {
  documentId: string;
  documentTitle: string;
}

export interface SignerSummary {
  name: string;
  role: string;
  email: string;
  status: string;
}

export interface SignerSignedSummary extends SignerSummary {
  signedDocumentBase64?: string;
  signedDocumentType?: string;
}

export interface InitiateEnvelopeResponse {
  envelopeId: string;
  title: string;
  status: EnvelopeStatus;
  sentDate: string;
  documents: DocumentSummary[];
  signers: SignerSummary[];
}

export interface EnvelopeSignedResponse {
  envelopeId: string;
  title: string;
  status: EnvelopeStatus;
  sentDate: string;
  documents: DocumentSummary[];
  signers: SignerSignedSummary[];
}

export type EnvelopeStatus = 'Pending' | 'Signed' | 'Expired' | 'Cancelled';

// ── Portal / Signing ──────────────────────────────────────────────────────────

export interface DocumentPreviewResponse {
  documentBase64: string;
  contentType: string;
  claimantName: string;
  documentFileName: string;
  expiresAt: string;
  // portal endpoint also exposes these via signer record
  signerEmail?: string;
  message?: string;
}

export interface SubmitSignatureRequest {
  signatureBase64: string;
}

// ── Utility ───────────────────────────────────────────────────────────────────

export interface ApiError {
  message: string;
  status?: number;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  isEmailVerified: boolean;
  accessRole: AccessRole;
}
