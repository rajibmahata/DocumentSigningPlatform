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
| `POST` | `/api/signing/initiate` | None (internal API) | Firm uploads document, gets signing link |
| `GET` | `/api/signing/status/{id}` | None | Poll status of a signing request |
| `GET` | `/api/portal/validate/{token}` | HMAC token | Validate token, return document for preview |
| `POST` | `/api/portal/submit/{token}` | HMAC token | Submit signature, enqueue stamp job |

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
