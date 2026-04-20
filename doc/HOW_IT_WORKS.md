# Document Signing Platform — Step-by-Step Flow

This document walks through the complete lifecycle of a document signing request, from the firm's initial API call to the claimant's signed document being stored and notifications sent.

---

## Complete Flow Diagram

```
FIRM                           API SERVER                        CLAIMANT
 │                                  │                                │
 │  POST /api/signing/initiate       │                                │
 │  { ClaimId, Email, DocBase64 }   │                                │
 ├─────────────────────────────────►│                                │
 │                                  │  1. Validate document bytes    │
 │                                  │  2. SHA-256 hash document      │
 │                                  │  3. Save Document record       │
 │                                  │  4. Generate HMAC token        │
 │                                  │  5. Save SigningRequest        │
 │                                  │  6. Enqueue SendEmail job      │
 │                                  │  7. Write AuditLog             │
 │  201 Created                     │                                │
 │  { SigningRequestId, ExpiresAt } │                                │
 │◄─────────────────────────────────│                                │
 │                                  │                                │
 │                         [OutboxWorker picks up SendEmail job]     │
 │                                  │                                │
 │                                  │──── Email ────────────────────►│
 │                                  │  "Please sign: /sign/{token}"  │
 │                                  │                                │
 │                                  │            Claimant clicks link│
 │                                  │◄───────────────────────────────│
 │                                  │  GET /api/portal/validate/{token}
 │                                  │                                │
 │                                  │  1. Look up token in DB        │
 │                                  │  2. Check expiry (410 if expired)
 │                                  │  3. Check already signed (400) │
 │                                  │  4. Validate HMAC signature    │
 │                                  │  5. Fetch Document + Claim     │
 │                                  │  6. Write AuditLog (PortalOpened)
 │                                  │                                │
 │                                  │──── DocumentPreviewResponse ──►│
 │                                  │  { DocBase64, ContentType,     │
 │                                  │    ClaimantName, ExpiresAt }   │
 │                                  │                                │
 │                                  │            Claimant draws/types│
 │                                  │            signature, checks   │
 │                                  │            consent, clicks Sign│
 │                                  │◄───────────────────────────────│
 │                                  │  POST /api/portal/submit/{token}
 │                                  │  { SignatureBase64, SignedDate }│
 │                                  │                                │
 │                                  │  1. Look up token              │
 │                                  │  2. Check expiry               │
 │                                  │  3. Check Status == Pending    │
 │                                  │  4. Validate HMAC              │
 │                                  │  5. Validate base64 signature  │
 │                                  │  6. ATOMIC lock (ExecuteUpdate)│
 │                                  │  7. Enqueue StampDoc job       │
 │                                  │  8. Write AuditLog             │
 │                                  │──── 202 Accepted ─────────────►│
 │                                  │                                │
 │                         [OutboxWorker picks up StampDoc job]      │
 │                                  │                                │
 │                                  │  1. Load Document bytes        │
 │                                  │  2. Stamp signature on PDF/DOCX│
 │                                  │  3. Save SignedDocument        │
 │                                  │  4. Update SigningRequest → Signed
 │                                  │  5. Update Claim → Signed      │
 │                                  │  6. Write AuditLog             │
 │                                  │  7. Enqueue Confirmation email │
 │                                  │  8. Enqueue Firm Notification  │
 │                                  │                                │
 │                         [OutboxWorker delivers Confirmation]      │
 │                                  │──── Email ────────────────────►│
 │                                  │  "Your signed document copy"   │
 │                                  │                                │
 │                         [OutboxWorker delivers FirmNotification]  │
 │◄── Email ────────────────────────│                                │
 │  "Claimant {name} has signed"    │                                │
```

---

## Step-by-Step Detail

### STEP 1 — Firm Initiates Signing

**Endpoint**: `POST /api/signing/initiate`

**Request body**:
```json
{
  "claimId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "claimantEmail": "john.smith@example.com",
  "claimantName": "John Smith",
  "documentBase64": "<base64-encoded PDF or DOCX bytes>",
  "documentContentType": "application/pdf"
}
```

**Server processing**:
1. Validates `documentBase64` is non-empty and valid base64
2. Validates `documentContentType` is `application/pdf` or DOCX MIME type
3. Looks up `ClaimId` — if not found, auto-creates a new `Claim` record
4. Computes `SHA-256` hash of document bytes (for integrity audit)
5. Saves `Document` entity (bytes + content type + hash)
6. Calls `TokenService.GenerateToken(claimId, documentId)` → `{guid:N}.{HMAC-SHA256-hex}`
7. Saves `SigningRequest` with `Status=Pending`, `ExpiresAt=UtcNow+7days`, `Token`
8. Enqueues `SendEmail` job in `OutboxQueue` with payload: `{ To, ToName, SigningLink, ExpiresAt, EmailType="Invitation" }`
9. Appends `AuditLog` entry: `Action="SigningInitiated"` with IP + UserAgent
10. Returns `201 Created` with `{ SigningRequestId, ExpiresAt }`

**Rate limiting**: 10 requests per minute per IP.

---

### STEP 2 — Invitation Email is Sent

**Trigger**: `OutboxWorker` (background service) polls `OutboxQueue` every 5 seconds.

**Processing**:
1. Worker queries `OutboxQueue WHERE Status=Pending ORDER BY CreatedAt`
2. Atomically updates `Status=Processing` via `ExecuteUpdateAsync` (prevents double-delivery)
3. Dispatches to `EmailService.SendAsync` based on `JobType=SendEmail`
4. Constructs email: subject "Please sign your document", body contains signing portal link
5. Sends via MailKit SMTP
6. Marks job `Status=Done`

**Retry logic**: If SMTP fails, `RetryCount` increments; max 3 attempts before `Status=Failed`.

**Email signing link format**:
```
https://yourapp.com/sign/{tokenGuid:N}.{hmac-hex}
```

---

### STEP 3 — Claimant Opens Blazor Portal

**URL**: `/sign/{token}` (Blazor Server page)

**Client-side** (`Sign.razor`):
1. On `OnInitializedAsync`, calls `GET /api/portal/validate/{token}` via `HttpClient`
2. If 200 OK: stores document base64, content type, claimant name, expiry — renders the signing page
3. If 410 Gone: shows "This signing link has expired"
4. If other error: shows generic invalid link message

**Server-side** (`PortalController.Validate`):
1. Looks up `SigningRequest` by `Token` (unique index query — fast)
2. Checks `ExpiresAt < UtcNow` → returns `410 Gone`
3. Checks `Status == Signed` → returns `400 Bad Request`
4. Validates HMAC: recomputes `HMAC-SHA256({tokenGuid}{claimId}{documentId})`, compares with constant-time equality
5. Fetches `Document` and `Claim` from DB
6. Writes `AuditLog`: `Action="PortalOpened"`
7. Returns `DocumentPreviewResponse { DocumentBase64, ContentType, ClaimantName, ExpiresAt }`

---

### STEP 4 — Claimant Reviews Document and Signs

**Blazor UI flow**:

#### If signing PDF:
- Document displayed inline via `<object data="data:application/pdf;base64,...">` tag
- Claimant can scroll through document in-browser

#### If signing DOCX:
- Download link provided to review locally

#### Signature input modes:

**Draw mode** (default):
1. HTML5 Canvas (`<canvas id="sigCanvas">`) initialized via `signaturePad.init("sigCanvas")`
2. JavaScript captures mouse/touch events and draws strokes in real-time
3. On submit: `signaturePad.getDataUrl("sigCanvas")` returns `data:image/png;base64,...`
4. Empty check: `signaturePad.isEmpty("sigCanvas")` — rejects blank submissions

**Type mode**:
1. Text input field for full name
2. On submit: `signaturePad.renderTypedSignature(name)` draws name on an off-screen canvas (500×150px) using cursive font
3. Returns base64 PNG of the rendered text

#### Consent checkbox:
- Must be checked before the "Sign Document" button becomes active

---

### STEP 5 — Signature Submission

**Endpoint**: `POST /api/portal/submit/{token}`

**Request body**:
```json
{
  "signatureBase64": "<base64-encoded PNG image>",
  "signedDate": "2026-04-07 13:30:00 UTC"
}
```

**Server processing**:
1. Validates `SignatureBase64` is non-empty
2. Looks up `SigningRequest` by token
3. Checks `ExpiresAt` (returns `410 Gone` if expired)
4. Checks `Status == Pending` (returns `400` if not pending)
5. Validates HMAC signature on token
6. Validates `SignatureBase64` is valid base64 (try/catch decode)
7. **Atomic lock**: `ExecuteUpdateAsync WHERE Token=x AND Status=Pending → Status=Processing` (returns `409 Conflict` if 0 rows affected — already being processed)
8. Enqueues `StampDoc` job in `OutboxQueue` with payload: `{ DocumentId, SigningRequestId, ClaimId, SignatureBase64, SignedDate }`
9. Writes `AuditLog`: `Action="SignatureSubmitted"`
10. Returns `202 Accepted`

---

### STEP 6 — Document Stamping (Background Job)

**Trigger**: `OutboxWorker` picks up `StampDoc` job.

**Processing** (`StampDocJobHandler.HandleAsync`):

1. Deserializes `StampPdfPayload` from job JSON
2. Loads `Document` bytes from DB
3. Loads `Claim` (for claimant name)
4. Loads `SigningRequest` (for status update)
5. Decodes `SignatureBase64` → PNG byte array

**For PDF** (`PdfDocumentStamper`):
- Opens PDF with iText7 `PdfDocument`
- Navigates to last page
- Positions signature image at bottom-right (10pt from edges)
- Adds date/name label below image
- Saves to memory stream → `stampedBytes`

**For DOCX** (`DocxDocumentStamper`):
- Opens DOCX with `WordprocessingDocument`
- Finds `##SIGNATURE##` placeholder paragraph in document body
- Replaces with inline image element (the PNG signature)
- Saves → `stampedBytes`

6. Saves `SignedDocument` entity (stamped bytes, content type, foreign keys)
7. Updates `SigningRequest.Status = Signed`, sets `SignedAt = UtcNow`
8. Updates `Claim.Status = Signed`, sets `Claim.SignedDocRef = signedDoc.Id`
9. Writes `AuditLog`: `Action="DocumentStamped"`
10. Enqueues `SendConfirmation` job → claimant receives signed copy
11. Enqueues `SendFirmNotification` job → firm receives alert email
12. All changes saved via EF Core

---

### STEP 7 — Confirmation & Notification Emails

**Confirmation to claimant** (`SendConfirmation` job):
- Subject: "Your document has been signed"
- Body includes `SignedDocumentId` reference
- Claimant can follow up with firm to obtain the signed document file

**Firm notification** (`SendFirmNotification` job):
- Sent to `Email:FirmAddress` in config
- Body: "Claimant {Name} has signed document for claim {ClaimId}"
- Firm can then retrieve the signed bytes via their internal system / DB query

---

### STEP 8 — Polling Status (Optional)

The firm can poll signing status at any time:

**Endpoint**: `GET /api/signing/status/{signingRequestId}`

**Response**:
```json
{
  "signingRequestId": "3fa85f64-...",
  "status": "Signed",
  "signedAt": "2026-04-07T13:45:22Z"
}
```

Status values: `Pending` → `Processing` → `Signed` (or `Expired` / `Failed`)

---

## Token Security Model

```
Token format:  {tokenGuid:N}.{HMAC-SHA256-hex}
Example:       a1b2c3d4e5f64a7b8c9d0e1f2a3b4c5d.9f86d0818c9d4e3a...

Signature payload: UTF8("{tokenGuid:N}{claimId:N}{documentId:N}")
HMAC key:          Token:Secret from configuration (≥32 characters)
Comparison:        CryptographicOperations.FixedTimeEquals (timing-attack safe)
```

- The token binds together `tokenGuid + claimId + documentId` — tampering any part invalidates the HMAC
- No database lookup possible without HMAC validation first
- Expiry enforced server-side on every use, independent of token content
- Tokens are single-purpose: once the document is signed, the token is rejected

---

## Error Handling Reference

| Scenario | HTTP Status | Message |
|---|---|---|
| Invalid base64 document | 400 | "DocumentBase64 is not valid base64." |
| Unsupported doc type | 400 | "Unsupported document content type." |
| Token not found | 404 | "Token not found." |
| Token expired | 410 Gone | "Token has expired." |
| Already signed | 400 | "This document has already been signed." |
| HMAC invalid | 400 | "Invalid token signature." |
| Already processing | 409 Conflict | "Signing request is already being processed." |
| Signature empty | 400 | "SignatureBase64 is required." |
| Signing request not found | 404 | — |

---

## Signer Rejection Flow

A signer may reject a document instead of signing it.

**Endpoint**: `POST /api/portal/reject/{token}`

**Optional request body**:
```json
{ "reason": "Terms are not acceptable." }
```

**Server processing**:
1. Looks up `SigningRequest` by token
2. Checks `ExpiresAt` — returns `410 Gone` if expired
3. Checks `Status == Pending` — returns `400` if already processed
4. Validates HMAC signature
5. Marks `SigningRequest.Status = Failed` (terminal state for the signer)
6. Sets `SigningEnvelope.Status = Rejected`
7. Writes `AuditLog`: `Action="Envelope.Rejected"` with rejection reason, claimant name/email, merchantId
8. Returns `204 No Content`

> Once rejected, the envelope enters a terminal state — no further signing can occur. The merchant can see the `Rejected` status via `GET /api/envelopes/{id}` or in the dashboard.

---

## Envelope Cancellation Flow

A merchant (sender) may cancel an envelope before it reaches a terminal state.

**Endpoint**: `PUT /api/envelopes/{id}/cancel`  
**Auth**: `X-Api-Key` header required.

**Cancellable statuses**: `Processing`, `Sent`, `Signed`  
**Non-cancellable (terminal) statuses**: `Completed`, `Failed`, `Expired`, `Rejected`, `Cancelled`

**Server processing**:
1. Looks up envelope by ID, verifies merchant ownership via API key
2. Checks that current status is one of the cancellable statuses — returns `409 Conflict` otherwise
3. Atomically sets `Status = Cancelled` via `ExecuteUpdateAsync`
4. Writes `AuditLog`: `Action="Envelope.Cancelled"` with merchantId and envelope title
5. Returns `204 No Content`

> The UI dashboard "Cancel Envelope" button is only shown when the envelope is in a cancellable state (`Processing`, `Sent`, or `Signed`). After cancellation the button is hidden and the status badge updates to `Cancelled`.

---

## Envelope Status Lifecycle

```
        ┌─────────────┐
        │  Processing │ ←─ Created; emails being prepared
        └──────┬──────┘
               │ emails dispatched
               ▼
           ┌───────┐
           │ Sent  │ ←─ All invitation emails queued
           └───┬───┘
               │ first signer signs
               ▼
          ┌────────┐
          │ Signed │ ←─ At least one signer done (multi-signer)
          └───┬────┘
              │ all signers done
              ▼
        ┌───────────┐
        │ Completed │  (terminal ✅)
        └───────────┘

 From Processing / Sent / Signed:
   → Cancelled  (sender calls PUT /api/envelopes/{id}/cancel)     (terminal 🚫)
   → Rejected   (signer calls POST /api/portal/reject/{token})    (terminal 🚫)
   → Expired    (signing window elapsed without completion)        (terminal ⏰)
   → Failed     (system error during email send or PDF stamping)   (terminal ❌)
```

---

## Audit Trail

Every significant event is recorded in `AuditLogs` with IP address, user agent, and timestamp:

| Action | Trigger |
|---|---|
| `Envelope.Created` | Envelope created via `POST /api/envelopes` |
| `Envelope.Sent` | Invitation emails dispatched to all signers |
| `Envelope.Viewed` | Signer opens the signing portal page |
| `Envelope.Signed` | A signer completes signing (multi-signer in progress) |
| `Envelope.Completed` | All signers have signed |
| `Envelope.Cancelled` | Sender cancels via `PUT /api/envelopes/{id}/cancel` |
| `Envelope.Rejected` | Signer rejects via `POST /api/portal/reject/{token}` |
| `Envelope.Failed` | System error during send or document stamping |
| `Envelope.Expired` | Signing window elapsed without all signers completing |
| `Document.Uploaded` | Document attached to envelope |
| `Document.SignatureSubmitted` | Signer submits signature bytes |
| `Document.Stamped` | Background job completes PDF/DOCX stamping |
| `Document.Downloaded` | Signed document downloaded via API |
| `Portal.Opened` | Claimant's browser hits `GET /api/portal/validate/{token}` |
| `User.Registered` | New user registration |
| `User.LoggedIn` | Successful login |
| `User.LoginFailed` | Failed login attempt |
| `User.EmailVerified` | Email address confirmed |
| `User.PasswordResetRequested` | Forgot-password triggered |
| `User.PasswordReset` | Password changed via reset link |
| `User.Updated` | User profile updated |
| `Merchant.Created` | Merchant account created |
| `Merchant.Updated` | Merchant settings changed |
| `Merchant.ApiKeyRegenerated` | API key rotated |
| `Merchant.LimitUpdated` | Request limit changed |
| `Ticket.Created` | Support ticket opened |
| `Ticket.Updated` | Ticket fields changed |
| `Ticket.Replied` | Message added to ticket thread |
| `Ticket.Closed` | Ticket closed |
| `Ticket.Resolved` | Ticket resolved |
| `SignerContact.Created` | Contact added manually or auto-created from envelope |
| `SignerContact.Updated` | Contact record edited |
| `SignerContact.Deleted` | Contact soft-deleted |
| `SignerContact.Imported` | Batch CSV import completed |

---

## Signer Contact Management

### Overview

Signer Contacts is a personal address book scoped to the authenticated user. Contacts are created automatically when an envelope is sent (via `UpsertFromSignerAsync`) and can also be managed manually via the REST API or the dashboard UI.

**Key rules:**
- Email is unique **per user** — two users may have the same contact email, but a single user cannot have two contacts with the same email.
- Deletion is a **soft-delete** (`IsActive = false`). Re-importing or re-adding the same email restores the contact.
- All write endpoints return `409 Conflict` when an email uniqueness violation is attempted.

---

### Entity

```
SignerContacts table
────────────────────────────────────────────────────────
Id          UNIQUEIDENTIFIER  PK  (Guid, default newid())
UserId      UNIQUEIDENTIFIER  FK → AspNetUsers.Id
Name        NVARCHAR(255)     NOT NULL
Email       NVARCHAR(255)     NOT NULL
Role        NVARCHAR(50)      NOT NULL  default 'signer'
Phone       NVARCHAR(50)      NULL
Company     NVARCHAR(255)     NULL
IsActive    BIT               NOT NULL  default 1
CreatedAt   DATETIME2         NOT NULL
UpdatedAt   DATETIME2         NOT NULL

UNIQUE INDEX: IX_SignerContacts_UserId_Email (UserId, Email)
```

---

### API Endpoints

All endpoints require a valid JWT in the `Authorization: Bearer <jwt>` header.  
Contacts are always scoped to the **authenticated caller** — one user cannot see or modify another user's contacts.

---

#### `GET /api/signer-contacts`

Returns the full list of active contacts for the caller.

**Response `200 OK`**:
```json
[
  {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "userId": "...",
    "name": "Jane Smith",
    "email": "jane.smith@example.com",
    "role": "signer",
    "phone": "+1 555 0101",
    "company": "Acme Corp",
    "isActive": true,
    "createdAt": "2026-04-15T10:00:00Z",
    "updatedAt": "2026-04-15T10:00:00Z"
  }
]
```

---

#### `GET /api/signer-contacts/search?q={query}`

Full-text search across `Name` and `Email` fields.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `q` | string | Yes | Search term (partial match, case-insensitive) |

**Response `200 OK`**: same shape as list endpoint.

---

#### `POST /api/signer-contacts`

Create a new contact.

**Request body**:
```json
{
  "name": "Jane Smith",
  "email": "jane.smith@example.com",
  "role": "signer",
  "phone": "+1 555 0101",
  "company": "Acme Corp"
}
```

| Field | Required | Default | Notes |
|---|---|---|---|
| `name` | Yes | — | |
| `email` | Yes | — | Must be unique for this user |
| `role` | No | `"signer"` | Free text; suggested: `signer`, `reviewer`, `approver` |
| `phone` | No | `null` | |
| `company` | No | `null` | |

**Responses**:
- `201 Created` — contact object
- `409 Conflict` — `{ "message": "A contact with email '...' already exists." }`

> If the email belongs to a previously soft-deleted contact, the contact is **restored** (not created again).

---

#### `PUT /api/signer-contacts/{id}`

Update an existing contact.

**Route param**: `id` — contact GUID.

**Request body** (all fields required):
```json
{
  "name": "Jane Smith-Jones",
  "email": "jane.jones@example.com",
  "role": "approver",
  "phone": "+1 555 0102",
  "company": "Acme Corp",
  "isActive": true
}
```

**Responses**:
- `200 OK` — updated contact object
- `404 Not Found` — contact not found or not owned by caller
- `409 Conflict` — new email already used by another contact

---

#### `DELETE /api/signer-contacts/{id}`

Soft-deletes a contact (`IsActive = false`). The contact is hidden from list/search results but remains in the database.

**Route param**: `id` — contact GUID.

**Responses**:
- `204 No Content` — deleted
- `404 Not Found` — not found or not owned by caller

---

#### `POST /api/signer-contacts/import`  *(multipart/form-data)*

Bulk-import contacts from a CSV file.

**Form field**: `file` — `.csv` file.

**CSV format**:

| Column (position) | Required | Default | Description |
|---|---|---|---|
| `name` (col 1) | Yes | — | Full name |
| `email` (col 2) | Yes | — | Must be unique per user |
| `role` (col 3) | No | `signer` | Role label |
| `phone` (col 4) | No | — | |
| `company` (col 5) | No | — | |

- First row is automatically detected as a header and skipped if it contains `"name"` or `"email"`.
- Values may be quoted (`"Jane Smith"`).
- Rows with duplicate email are **skipped** (counted in `skipped`; not an error).
- Rows with invalid email format or missing name/email are **failed** (counted in `failed`).

**Sample CSV**:
```
name,email,role,phone,company
Jane Smith,jane.smith@example.com,signer,+1 555 0101,Acme Corp
John Doe,john.doe@example.com,reviewer,,
Alice Brown,alice.brown@example.com,approver,+44 20 7946 0958,Globex Ltd
```

**Response `200 OK`**:
```json
{
  "imported": 3,
  "skipped": 1,
  "failed": 0,
  "errors": []
}
```

| Field | Description |
|---|---|
| `imported` | Rows successfully created or restored |
| `skipped` | Rows where email already exists as an active contact |
| `failed` | Rows rejected due to validation errors |
| `errors` | Array of per-row error strings, e.g. `"Row 4: 'bad-email' is not a valid email — skipped."` |

---

#### `GET /api/signer-contacts/export`  *(text/csv)*

Exports all active contacts for the caller as a CSV file.

**Response `200 OK`**: `Content-Type: text/csv`, `Content-Disposition: attachment; filename="signer-contacts.csv"`

**CSV columns**: `id, name, email, role, phone, company, createdAt`

---

### Auto-Creation from Envelopes

When a user sends an envelope, the API automatically calls `UpsertFromSignerAsync` for each recipient. This means contacts are kept in sync with sent envelopes without any extra action:

- If the recipient email is **new** → a contact is created with name, email, and role from the signer row.
- If the email **already exists** and is active → the contact is left unchanged.
- If the email exists but was **soft-deleted** → it is restored silently.

---

### Duplicate Check Summary

| Operation | Duplicate handling |
|---|---|
| `POST /api/signer-contacts` | Returns `409 Conflict` |
| `PUT /api/signer-contacts/{id}` | Returns `409 Conflict` if new email clashes |
| CSV Import | Row is counted as `skipped`; import continues |
| Auto-create from envelope | Silent no-op if email already active |
| Re-add soft-deleted email | Contact is **restored**, not duplicated |


