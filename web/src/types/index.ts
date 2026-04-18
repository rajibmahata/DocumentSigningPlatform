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
  accessRole?: AccessRole;
}

// ── Merchant ──────────────────────────────────────────────────────────────────

export interface CreateMerchantRequest {
  userId: string;
  name: string;
  description?: string;
  requestLimit?: number;
}

export interface UpdateMerchantRequest {
  name?: string;
  description?: string;
  isActive: boolean;
  requestLimit: number;
  subscriptionEnd?: string;
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

export type EnvelopeStatus = 'Sent' | 'InProgress' | 'Completed' | 'Cancelled';

// ── Portal / Signing ──────────────────────────────────────────────────────────

export interface PlatformStats {
  documentsSent: number;
  documentsSigned: number;
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export interface DailyCount {
  date: string;
  count: number;
}

export interface AnalyticsSummary {
  totalUsers: number;
  totalEnvelopesSent: number;
  totalEnvelopesSigned: number;
  totalEnvelopesCancelled: number;
  totalDocumentsSigned: number;
}

// ── Tickets ──────────────────────────────────────────────────────────────────

export type TicketType     = 'Bug' | 'Feedback' | 'FeatureRequest';
export type TicketStatus   = 'Open' | 'InProgress' | 'Resolved' | 'Closed';
export type TicketPriority = 'Low' | 'Medium' | 'High';

export interface CreateTicketRequest {
  title: string;
  description: string;
  type: TicketType;
  attachmentBase64?: string;
  attachmentContentType?: string;
}

export interface AddTicketMessageRequest {
  message: string;
}

export interface UpdateTicketStatusRequest {
  status: TicketStatus;
  priority?: TicketPriority;
}

export interface TicketMessageResponse {
  id: string;
  senderType: 'User' | 'Admin';
  message: string;
  createdAt: string;
}

export interface TicketResponse {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  merchantId?: string;
  title: string;
  description: string;
  type: TicketType;
  status: TicketStatus;
  priority?: TicketPriority;
  attachmentBase64?: string;
  attachmentContentType?: string;
  createdAt: string;
  updatedAt?: string;
  messages: TicketMessageResponse[];
}

export interface TicketSummary {
  id: string;
  userName: string;
  userEmail: string;
  title: string;
  type: TicketType;
  status: TicketStatus;
  priority?: TicketPriority;
  messageCount: number;
  hasAttachment: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface AnalyticsTrends {
  userRegistrations: DailyCount[];
  envelopesSent: DailyCount[];
  documentsSigned: DailyCount[];
}

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

// ── My Envelopes (signer portal) ─────────────────────────────────────────────

export interface MyEnvelopeDocumentSummary {
  documentTitle: string;
  documentFileName: string;
}

export interface MyEnvelopeResponse {
  envelopeId: string;
  title: string;
  status: EnvelopeStatus;
  createdAt: string;
  createdByName: string;
  signerRole: string;
  signingToken: string;
  expiresAt: string;
  documents: MyEnvelopeDocumentSummary[];
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
