# Document Signing Platform — Implementation Plan & Architecture

## Overview

An in-house electronic document signing platform that allows a firm to send documents to claimants for legally-binding e-signature. Built on:

- **ASP.NET Core 8 Web API** + **Blazor Server** (same process)
- **EF Core 8** with **SQL Server**
- **Background job processing** via an Outbox pattern
- **iText7** (PDF stamping) and **OpenXml** (DOCX stamping)
- **MailKit** for SMTP email delivery
- **HMAC-SHA256** token authentication (no login required; link-based)

---

## Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────────┐
│  Firm's System (External Caller)                                           │
│  POST /api/signing/initiate  { ClaimId, ClaimantEmail, DocumentBase64 }    │
└──────────────────────────┬─────────────────────────────────────────────────┘
                           │ HTTP
                           ▼
┌────────────────────────────────────────────────────────────────────────────┐
│  DocumentSigning.Api  (ASP.NET Core 8 + Blazor Server)                     │
│                                                                            │
│   Controllers:                                                             │
│   ├── SigningController      → /api/signing/initiate, /api/signing/status  │
│   ├── PortalController       → /api/portal/validate/{token}               │
│   └── SignatureSubmitController → /api/portal/submit/{token}              │
│                                                                            │
│   Blazor Pages:                                                            │
│   └── /sign/{token}   ← Claimant visits this URL in their browser         │
└──────────────┬─────────────────────────┬───────────────────────────────────┘
               │                         │
               ▼                         ▼
┌─────────────────────────┐  ┌──────────────────────────────────────────────┐
│  DocumentSigning.Core   │  │  DocumentSigning.Infrastructure               │
│  (Domain Layer)         │  │                                              │
│                         │  │  Repositories:                               │
│  Entities:              │  │  ├── ClaimRepository                         │
│  ├── Claim              │  │  ├── DocumentRepository                       │
│  ├── Document           │  │  ├── SigningRequestRepository                 │
│  ├── SigningRequest      │  │  ├── SignedDocumentRepository                 │
│  ├── SignedDocument      │  │  ├── OutboxQueueRepository                   │
│  ├── OutboxQueue         │  │  └── AuditLogRepository                      │
│  └── AuditLog           │  │                                              │
│                         │  │  Services:                                   │
│  Interfaces:            │  │  ├── TokenService (HMAC-SHA256)               │
│  ├── ITokenService       │  │  ├── PdfDocumentStamper (iText7)             │
│  ├── IDocumentStamper    │  │  ├── DocxDocumentStamper (OpenXml)           │
│  ├── IEmailService       │  │  ├── DocumentStamperDispatcher               │
│  └── IRepository<T>      │  │  └── EmailService (MailKit)                  │
│                         │  │                                              │
│  DTOs / Enums           │  │  Background Jobs:                            │
│                         │  │  ├── OutboxWorker (IHostedService)            │
│                         │  │  └── StampDocJobHandler                      │
└─────────────────────────┘  └──────────────────────┬───────────────────────┘
                                                     │
                                                     ▼
                                        ┌────────────────────────┐
                                        │   SQL Server            │
                                        │   (DocumentSigningDb)   │
                                        └────────────────────────┘
```

---

## Implementation Modules

### MODULE 1 — Solution Scaffold
- `.slnx` solution file (new XML format, VS 2022 17.9+)
- 3 projects: `DocumentSigning.Core`, `DocumentSigning.Infrastructure`, `DocumentSigning.Api`
- Project references wired: `Api → Infrastructure → Core`

### MODULE 2 — Core Domain
- **Enums**: `ClaimStatus`, `SigningStatus`, `JobStatus`
- **Entities**: `Claim`, `Document`, `SigningRequest`, `SignedDocument`, `OutboxQueue`, `AuditLog`
- **Interfaces**: all repository contracts + `ITokenService`, `IDocumentStamper`, `IEmailService`
- **DTOs**: immutable C# records for all request/response shapes

### MODULE 3 — EF Core DbContext & Migrations
- `AppDbContext` with 6 `DbSet<T>` properties
- Custom configuration: unique index on `Token`, enum-as-int storage, `nvarchar` max lengths
- `AppDbContextFactory` for design-time migration tooling
- Migration `InitialCreate` applied to SQL Server

### MODULE 4 — Repositories
- All 6 repositories with standard CRUD
- `SigningRequestRepository.TryLockForProcessingAsync`: atomic `ExecuteUpdateAsync` (prevents double-processing)
- `OutboxQueueRepository.ClaimNextJobAsync`: fetch + conditional `ExecuteUpdateAsync` (returns null if already claimed)

### MODULE 5 — Token Service
- Format: `{guid:N}.{HMAC-SHA256-hexlower}` (32 + 64 chars)
- Payload signed: `{tokenGuid}{claimId}{documentId}`
- Constant-time comparison via `CryptographicOperations.FixedTimeEquals`

### MODULE 6 — Document Stamper
- `PdfDocumentStamper`: iText7, stamps signature image at bottom-right of last page + date label
- `DocxDocumentStamper`: OpenXml, replaces `##SIGNATURE##` placeholder with inline image
- `DocumentStamperDispatcher`: routes to correct stamper by MIME type

### MODULE 7 — Email Service
- MailKit SMTP: supports SSL/TLS
- 4 email types: `Invitation`, `Confirmation`, `FirmNotification`, `AdminAlert`

### MODULE 8 — Background Job Processor (Outbox Worker)
- `OutboxWorker`: polls every 5s, dispatches by `JobType`
- Retry up to 3 times; marks `Failed` after max retries
- Job types: `SendEmail`, `StampDoc`, `SendConfirmation`, `SendFirmNotification`

### MODULE 9-11 — API Controllers
- `SigningController`: validates input, auto-creates claim, generates signed token, enqueues email job
- `PortalController`: validates HMAC token, checks expiry and status, returns document for preview
- `SignatureSubmitController`: validates token, atomically locks request, enqueues stamp job

### MODULE 12 — Blazor Signing Portal
- Route: `/sign/{token}`
- Tabs: **Draw** (HTML5 Canvas with mouse + touch support) and **Type** (Canvas text rendering via JS)
- PDF inline preview via `<object>` tag; DOCX download link
- Consent checkbox required before submission
- All JS in `wwwroot/js/signaturePad.js` (no external dependencies)

### MODULE 13 — StampDoc Job Handler
- Retrieves document bytes + signing request + claim
- Calls `IDocumentStamper.StampAsync`
- Persists `SignedDocument` entity
- Updates `SigningRequest.Status → Signed`
- Updates `Claim.Status → Signed` + sets `SignedDocRef`
- Writes audit log
- Enqueues confirmation email to claimant
- Enqueues firm notification email

### MODULE 14 — Security & Middleware
- Rate limiting: `FixedWindowLimiter` — 10 requests / 60s per IP, applied to all endpoints via `[EnableRateLimiting("signing")]`
- Antiforgery middleware for Blazor
- HTTPS redirect
- Swagger guarded by `IsDevelopment() || Swagger:Enabled` config flag

### MODULE 15 — DI Wiring (Program.cs)
- All repositories registered as `Scoped`
- All services registered as `Scoped` / `Transient`
- `OutboxWorker` registered as `Singleton` hosted service
- Auto-migrate on startup (development/staging)
- `HttpClient` factory for Blazor components calling their own API

---

## Database Schema

```
Claims
├── Id (uniqueidentifier PK)
├── ClaimantName (nvarchar 200)
├── ClaimantEmail (nvarchar 300)
├── Status (int)               → ClaimStatus enum
├── SignedDocRef (uniqueidentifier?)
└── CreatedAt (datetime2)

Documents
├── Id (uniqueidentifier PK)
├── ClaimId (uniqueidentifier FK → Claims)
├── ContentBytes (varbinary(max))
├── ContentType (nvarchar 200)
├── Hash (nvarchar 64)         → SHA-256 hex
└── CreatedAt (datetime2)

SigningRequests
├── Id (uniqueidentifier PK)
├── Token (nvarchar 200) UNIQUE INDEX
├── ClaimId (uniqueidentifier FK → Claims)
├── DocumentId (uniqueidentifier FK → Documents)
├── Status (int)               → SigningStatus enum
├── RetryCount (int)
├── ExpiresAt (datetime2)
├── SignedAt (datetime2?)
└── CreatedAt (datetime2)

SignedDocuments
├── Id (uniqueidentifier PK)
├── SigningRequestId (uniqueidentifier FK → SigningRequests)
├── ClaimId (uniqueidentifier FK → Claims)
├── ContentBytes (varbinary(max))
├── ContentType (nvarchar 200)
└── CreatedAt (datetime2)

OutboxQueue
├── Id (uniqueidentifier PK)
├── JobType (nvarchar 100)     INDEX
├── Payload (nvarchar(max))    → JSON-serialized payload
├── Status (int)               → JobStatus enum
├── RetryCount (int)
├── ProcessedAt (datetime2?)
└── CreatedAt (datetime2)

AuditLogs
├── Id (uniqueidentifier PK)
├── SigningRequestId (uniqueidentifier) INDEX
├── ClaimId (uniqueidentifier)
├── Action (nvarchar 200)
├── IpAddress (nvarchar 50)
├── UserAgent (nvarchar 500)
└── Timestamp (datetime2)
```

---

## API Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | None | Register a new user |
| `POST` | `/api/auth/login` | None | Login, receive JWT |
| `GET` | `/api/auth/verify-email/{token}` | None | Verify email address |
| `POST` | `/api/auth/forgot-password` | None | Request password-reset email |
| `POST` | `/api/auth/reset-password` | None | Reset password using emailed token |
| `GET` | `/api/users` | JWT (Admin) | List all users |
| `GET` | `/api/users/{id}` | JWT | Get user by ID |
| `PUT` | `/api/users/{id}` | JWT | Update user profile |
| `GET` | `/api/merchants` | JWT | List all merchants |
| `POST` | `/api/merchants` | JWT | Create a merchant |
| `GET` | `/api/merchants/by-user/{userId}` | JWT | Get merchant(s) for a user |
| `GET` | `/api/merchants/{id}` | JWT | Get merchant by ID |
| `PUT` | `/api/merchants/{id}` | JWT | Update merchant settings |
| `POST` | `/api/merchants/{id}/regenerate-key` | JWT | Rotate merchant API key |
| `POST` | `/api/envelopes` | X-Api-Key | Create envelope (upload docs, add signers) |
| `GET` | `/api/envelopes` | X-Api-Key | List envelopes for merchant |
| `GET` | `/api/envelopes/{id}` | X-Api-Key | Get envelope details |
| `GET` | `/api/envelopes/{id}/signed-documents` | X-Api-Key | Download signed documents (base64) |
| `PUT` | `/api/envelopes/{id}/cancel` | X-Api-Key | Cancel envelope (Processing/Sent/Signed only) |
| `GET` | `/api/portal/validate/{token}` | HMAC token | Validate signing token, return doc preview |
| `GET` | `/api/portal/document/{token}` | HMAC token | Stream raw document bytes |
| `POST` | `/api/portal/submit/{token}` | HMAC token | Submit signature, enqueue stamp job |
| `POST` | `/api/portal/reject/{token}` | HMAC token | Reject document with optional reason |
| `GET` | `/api/portal/my-envelopes` | JWT | Signer's envelope history |
| `GET` | `/api/analytics/summary` | JWT (Admin) | Platform statistics |
| `GET` | `/api/analytics/trends` | JWT (Admin) | Daily signing trends |
| `POST` | `/api/tickets` | JWT | Create support ticket |
| `GET` | `/api/tickets/my` | JWT | List my tickets |
| `GET` | `/api/tickets/{id}` | JWT | Get ticket detail |
| `POST` | `/api/tickets/{id}/message` | JWT | Add message to ticket thread |
| `GET` | `/api/admin/tickets` | JWT (Admin) | List all tickets |
| `PUT` | `/api/admin/tickets/{id}/status` | JWT (Admin) | Update ticket status and priority |
| `GET` | `/api/admin/audit-logs` | JWT (Admin) | Paged audit log (filter by userId, merchantId, action) |
| `GET` | `/api/admin/audit-logs/entity/{type}/{id}` | JWT (Admin) | Full event timeline for an entity |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Web Framework | ASP.NET Core 8.0 |
| UI Framework | Blazor Server 8.0 |
| ORM | Entity Framework Core 8.0 |
| Database | SQL Server 2019+ |
| PDF Stamping | iText7 |
| DOCX Stamping | DocumentFormat.OpenXml |
| Email | MailKit |
| Token Auth | HMAC-SHA256 (custom) |
| API Docs | Swashbuckle (Swagger) v6 |
| Testing | xUnit + Moq + FluentAssertions |
