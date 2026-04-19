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
