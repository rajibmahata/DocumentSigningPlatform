# Document Signing Platform – cURL Reference

Base URL: `http://localhost:5163`

> Replace `<jwt>`, `<api-key>`, `<merchant-id>`, `<envelope-id>`, `<user-id>`, and `<token>` with real values.

---

## Auth

### Register  ✅ Required: name, email, password  |  ❌ Optional: country, accessRole
```bash
curl -X POST http://localhost:5163/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Rajib Mahata",
    "email": "rajibmahata3@gmail.com",
    "password": "Password1",
    "country": "INDIA",
    "accessRole": null
  }'
```

### Login  ✅ Required: email, password
```bash
curl -X POST http://localhost:5163/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "rajibmahata3@gmail.com",
    "password": "Password1"
  }'
```
> Response: `{ "token": "<jwt>", "isEmailVerified": true }`

### Verify Email  ✅ Required: token (URL path, from email link)
```bash
curl -X GET "http://localhost:5163/api/auth/verify-email/<token>"
```

### Forgot Password  ✅ Required: email
```bash
curl -X POST http://localhost:5163/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{ "email": "rajibmahata3@gmail.com" }'
```

### Reset Password  ✅ Required: token, newPassword
```bash
curl -X POST http://localhost:5163/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "<reset-token-from-email>",
    "newPassword": "NewSecret1!"
  }'
```
> `newPassword` rules: min 8 chars, at least 1 uppercase, 1 lowercase, 1 digit.

---

## Merchants

> **Auto-creation on register:** A default merchant account is automatically created when a user registers, *unless* the user already has one. Users can create **additional** merchant accounts at any time using `POST /api/merchants`.

### Create Merchant  ✅ Required: userId, name  |  ❌ Optional: description, requestLimit
```bash
curl -X POST http://localhost:5163/api/merchants \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "<user-id>",
    "name": "Second Workspace",
    "description": "For invoicing clients",
    "requestLimit": 100
  }'
```
> Returns `201 Created` with the new merchant (including `id` and `apiKey`).  
> `requestLimit`: `0` = unlimited. Default is `100`.

### Get All Merchants (admin)
```bash
curl http://localhost:5163/api/merchants
```

### Get Merchants by User  ✅ Required: userId (URL path)
```bash
curl http://localhost:5163/api/merchants/by-user/<user-id>
```
> Returns all merchants owned by the given user.

### Get Merchant by ID  ✅ Required: id (URL path)
```bash
curl http://localhost:5163/api/merchants/<merchant-id>
```

### Update Merchant  ✅ Required: isActive, requestLimit  |  ❌ Optional: name, description, subscriptionEnd
```bash
curl -X PUT http://localhost:5163/api/merchants/<merchant-id> \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Corp Updated",
    "description": "Primary signing workspace",
    "isActive": true,
    "requestLimit": 500,
    "subscriptionEnd": "2027-12-31T23:59:59Z"
  }'
```
> `subscriptionEnd`: ISO-8601 UTC. Omit or set to `null` for no expiry.

### Regenerate API Key  ✅ Required: id (URL path)
```bash
curl -X POST http://localhost:5163/api/merchants/<merchant-id>/regenerate-key
```
> Old API key is immediately invalidated.

---

## Envelopes
> All envelope endpoints require **`X-Api-Key`** header.

### Create Envelope  ✅ Required: title, merchantId, documents[], signers[]
```bash
curl -X POST http://localhost:5163/api/envelopes \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: <api-key>" \
  -d '{
    "title": "Service Agreement – Q1 2026",
    "merchantId": "<merchant-id>",
    "documents": [
      {
        "documentTitle": "Service Agreement",
        "documentFileName": "service-agreement.pdf",
        "documentBase64": "<base64-encoded-pdf-bytes>",
        "documentContentType": "application/pdf"
      }
    ],
    "signers": [
      {
        "name": "Bob Jones",
        "email": "bob@example.com",
        "role": "Signer",
        "order": 1,
        "message": "Please review and sign the attached agreement."
      },
      {
        "name": "Carol White",
        "email": "carol@example.com",
        "role": "Counter-Signer",
        "order": 2,
        "message": "Please countersign once Bob has signed."
      }
    ]
  }'
```

**`documents[]` fields**
| Field | Required | Notes |
|---|---|---|
| `documentTitle` | ✅ | Human-readable label |
| `documentFileName` | ✅ | Filename with extension, e.g. `contract.pdf` |
| `documentBase64` | ✅ | Base64-encoded file bytes |
| `documentContentType` | ❌ | `application/pdf`, `application/msword`, or `application/vnd.openxmlformats-officedocument.wordprocessingml.document`. Inferred from filename extension if omitted. |

**`signers[]` fields**
| Field | Required | Notes |
|---|---|---|
| `name` | ✅ | Full name |
| `email` | ✅ | Signing invitation sent here |
| `role` | ✅ | Free-text, e.g. `"Signer"` |
| `order` | ✅ | Signing sequence (1-based) |
| `message` | ✅ | Note in invitation email |

> **Encode a PDF to base64 (PowerShell):** `[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\path\to\file.pdf"))`  
> **Encode a PDF to base64 (bash):** `base64 -w 0 file.pdf`

### Get All Envelopes
```bash
curl http://localhost:5163/api/envelopes \
  -H "X-Api-Key: <api-key>"
```

### Get Envelope by ID  ✅ Required: id (URL path)
```bash
curl http://localhost:5163/api/envelopes/<envelope-id> \
  -H "X-Api-Key: <api-key>"
```

### Get Signed Documents  ✅ Required: id (URL path)
```bash
curl http://localhost:5163/api/envelopes/<envelope-id>/signed-documents \
  -H "X-Api-Key: <api-key>"
```
> Returns each signer's signed document as `signedDocumentBase64` (null if not yet signed).

### Cancel Envelope  ✅ Required: id (URL path)
```bash
curl -X PUT http://localhost:5163/api/envelopes/<envelope-id>/cancel \
  -H "X-Api-Key: <api-key>"
```
> Cancels an envelope with status `Processing`, `Sent`, or `Signed`. Returns `204 No Content`.

**Envelope status lifecycle**
| Status | Description |
|---|---|
| `Processing` | Request accepted; system preparing and dispatching invitation emails |
| `Sent` | Invitation emails queued for all signers |
| `Signed` | At least one signer has signed (multi-signer envelope in progress) |
| `Completed` | All signers have completed signing |
| `Failed` | System error occurred during send or document stamping |
| `Cancelled` | Sender cancelled the envelope before completion |
| `Expired` | Signing window elapsed without completion |
| `Rejected` | A signer explicitly rejected the document |

---

## Portal (Signing Flow)
> No auth header needed for the public signing endpoints. Token is in the URL path.  
> Token is obtained from the signing invitation email sent to the signer.

### Validate Token & Get Document Preview  ✅ Required: token (URL path)
```bash
curl "http://localhost:5163/api/portal/validate/<signing-token>"
```
> Returns `documentBase64`, `contentType`, `claimantName`, `documentFileName`, `expiresAt`.

### Stream Raw Document  ✅ Required: token (URL path)
```bash
curl "http://localhost:5163/api/portal/document/<signing-token>" \
  --output document.pdf
```

### Submit Signature  ✅ Required: token (URL path), signatureBase64 (body)
```bash
curl -X POST "http://localhost:5163/api/portal/submit/<signing-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "signatureBase64": "<base64-encoded-PNG-signature>"
  }'
```
> `signatureBase64`: raw base64 PNG — do **NOT** include `data:image/png;base64,` prefix.

**Status codes**
| Code | Meaning |
|---|---|
| `202` | Accepted – signature queued for stamping |
| `400` | Already signed / invalid token signature |
| `404` | Token not found |
| `409` | Already being processed (duplicate submit) |
| `410` | Token expired |

### Reject Document  ✅ Required: token (URL path)
```bash
curl -X POST "http://localhost:5163/api/portal/reject/<signing-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Terms are not acceptable."
  }'
```
> Signer rejects the document. Sets the envelope status to `Rejected`. Token must still be valid (not expired).  
> `reason` is optional.

**Status codes**
| Code | Meaning |
|---|---|
| `204` | No Content – rejection recorded |
| `400` | Signing request no longer pending or invalid token |
| `404` | Token not found |
| `410` | Token expired |

### Get My Envelopes (Signer view)  ✅ Required: Authorization: Bearer `<jwt>`
```bash
curl http://localhost:5163/api/portal/my-envelopes \
  -H "Authorization: Bearer <jwt>"
```
> Returns every envelope where the authenticated user is listed as a signer.  
> The email claim from the JWT is used to match signer records.  
> Use the `signingToken` field from each item to build the signing URL: `/sign/<signingToken>`.

**Response shape**
```json
[
  {
    "envelopeId":   "uuid",
    "title":        "Service Agreement – Q1 2026",
    "status":       "Sent",
    "createdAt":    "2026-04-18T10:00:00Z",
    "createdByName":"WestParc Law",
    "signerRole":   "Signer",
    "signingToken": "abc123...token...",
    "expiresAt":    "2026-04-25T10:00:00Z",
    "documents": [
      { "documentTitle": "Service Agreement", "documentFileName": "service-agreement.pdf" }
    ]
  }
]
```

**`status` values:** `Processing` | `Sent` | `Signed` | `Completed` | `Failed` | `Cancelled` | `Expired` | `Rejected`

---

## Users
> All user endpoints require **`Authorization: Bearer <jwt>`**.

### Get All Users (Admin only)
```bash
curl http://localhost:5163/api/users \
  -H "Authorization: Bearer <jwt>"
```

### Get User by ID  ✅ Required: id (URL path)
```bash
curl http://localhost:5163/api/users/<user-id> \
  -H "Authorization: Bearer <jwt>"
```
> Regular users can only retrieve their own profile.

### Update User  ❌ Optional: name, accessRole
```bash
curl -X PUT http://localhost:5163/api/users/<user-id> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt>" \
  -d '{
    "name": "Alice Johnson",
    "accessRole": null
  }'
```

**Body fields**
| Field | Required | Notes |
|---|---|---|
| `name` | ❌ | New display name; ignored if blank/null |
| `accessRole` | ❌ | `"User"` or `"Admin"`. Non-admins receive 403 if this is set. |

---

## Analytics
> All analytics endpoints require **`Authorization: Bearer <jwt>`** with **Admin** role.

### Platform Summary  — counts for users, envelopes, signed documents, and support tickets
```bash
curl http://localhost:5163/api/analytics/summary \
  -H "Authorization: Bearer <jwt>"
```
> Response:
> ```json
> {
>   "totalUsers": 42,
>   "totalEnvelopesSent": 130,
>   "totalEnvelopesSigned": 98,
>   "totalEnvelopesCancelled": 5,
>   "totalDocumentsSigned": 211,
>   "totalTickets": 18,
>   "openTickets": 4,
>   "inProgressTickets": 3,
>   "resolvedTickets": 8,
>   "closedTickets": 3
> }
> ```

**Response fields**
| Field | Type | Notes |
|---|---|---|
| `totalUsers` | int | All registered users |
| `totalEnvelopesSent` | int | All envelopes created |
| `totalEnvelopesSigned` | int | Envelopes with status `Completed` |
| `totalEnvelopesCancelled` | int | Envelopes with status `Cancelled` |
| `totalDocumentsSigned` | int | Individual signed document records |
| `totalTickets` | int | All support tickets |
| `openTickets` | int | Tickets with status `Open` |
| `inProgressTickets` | int | Tickets with status `InProgress` |
| `resolvedTickets` | int | Tickets with status `Resolved` |
| `closedTickets` | int | Tickets with status `Closed` |

### Daily Trends  ❌ Optional: days (default 30, max 90)
```bash
curl "http://localhost:5163/api/analytics/trends?days=30" \
  -H "Authorization: Bearer <jwt>"
```
> Response:
> ```json
> {
>   "userRegistrations": [{ "date": "2026-03-15", "count": 3 }, "..."],
>   "envelopesSent":      [{ "date": "2026-03-15", "count": 8 }, "..."],
>   "documentsSigned":    [{ "date": "2026-03-15", "count": 6 }, "..."],
>   "ticketsCreated":     [{ "date": "2026-03-15", "count": 2 }, "..."]
> }
> ```
> `days`: valid range 7–90. Returns one entry per day that had activity.

**Response fields**
| Field | Type | Notes |
|---|---|---|
| `userRegistrations` | DailyCount[] | New user registrations per day |
| `envelopesSent` | DailyCount[] | Envelopes created per day |
| `documentsSigned` | DailyCount[] | Documents signed per day |
| `ticketsCreated` | DailyCount[] | New support tickets opened per day |

**DailyCount shape:** `{ "date": "2026-03-15", "count": 3 }`

---

## Tickets

> All ticket endpoints require **`Authorization: Bearer <jwt>`**.  
> Valid **`type`** values: `Bug` | `Feedback` | `FeatureRequest` (case-sensitive).  
> Valid **`status`** values: `Open` | `InProgress` | `Resolved` | `Closed` (case-sensitive).  
> Valid **`priority`** values: `Low` | `Medium` | `High`.

### Create Ticket  ✅ Required: title, description, type
```bash
curl -X POST http://localhost:5163/api/tickets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt>" \
  -d '{
    "title": "Login page crashes on mobile",
    "description": "Tapping the login button on iOS Safari causes a white screen.",
    "type": "Bug"
  }'
```
> Returns `201 Created` with the full `TicketResponse` (including `id`). Status is always `Open` on creation.

### Get My Tickets  — list all tickets for the authenticated user
```bash
curl http://localhost:5163/api/tickets/my \
  -H "Authorization: Bearer <jwt>"
```
> Returns `TicketSummary[]` sorted by creation date descending.

### Get Ticket by ID  ✅ Required: id (URL path)
```bash
curl http://localhost:5163/api/tickets/<ticket-id> \
  -H "Authorization: Bearer <jwt>"
```
> Returns full ticket with all chat messages. Returns `403` if the ticket belongs to another user (admin bypasses this check).

### Add Message to Ticket  ✅ Required: id (URL path), message (body)
```bash
curl -X POST http://localhost:5163/api/tickets/<ticket-id>/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt>" \
  -d '{
    "message": "I can reproduce this consistently on iPhone 14 running iOS 17."
  }'
```
> `senderType` is set automatically: `"User"` for regular users, `"Admin"` for admin users.  
> Returns `201 Created` with `TicketMessageResponse`.

---

## Tickets — Admin Endpoints

> All admin ticket endpoints require **`Authorization: Bearer <jwt>`** with **Admin** role.

### Get All Tickets (admin)  — across all users
```bash
curl http://localhost:5163/api/admin/tickets \
  -H "Authorization: Bearer <jwt>"
```
> Returns `TicketSummary[]` for every ticket in the system.

### Update Ticket Status & Priority (admin)  ✅ Required: status  |  ❌ Optional: priority
```bash
curl -X PUT http://localhost:5163/api/admin/tickets/<ticket-id>/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt>" \
  -d '{
    "status": "InProgress",
    "priority": "High"
  }'
```
> Returns `204 No Content` on success.  
> Omit `priority` or set to `null` to clear the current priority value.

**Status transition guide**
| From | Typical next | Notes |
|---|---|---|
| `Open` | `InProgress` | Admin has picked up the ticket |
| `InProgress` | `Resolved` | Fix deployed / answer given |
| `Resolved` | `Closed` | User confirmed resolution |
| Any | `Closed` | Force-close without resolution |

---

## Audit Logs — Admin

> All audit endpoints require **`Authorization: Bearer <jwt>`** with **Admin** role.

### Get Paged Audit Log  — filtered, sorted, paginated
```bash
curl "http://localhost:5163/api/admin/audit-logs" \
  -H "Authorization: Bearer <jwt>"
```

All query parameters are optional:

| Parameter | Type | Description |
|---|---|---|
| `action` | string | Filter by action name, e.g. `Document.SignatureSubmitted` |
| `entityType` | string | `Envelope` \| `Document` \| `User` \| `Merchant` \| `Ticket` \| `Portal` |
| `entityId` | guid | Filter by specific entity ID |
| `userId` | guid | Filter by the user who triggered the event |
| `merchantId` | guid | Filter by merchant |
| `status` | string | `Success` \| `Failure` \| `Warning` |
| `from` | ISO-8601 | Start of date range (UTC) |
| `to` | ISO-8601 | End of date range (UTC) |
| `page` | int | Page number (default `1`) |
| `pageSize` | int | Results per page (default `50`) |

**Example — last 24 h failures:**
```bash
curl "http://localhost:5163/api/admin/audit-logs?status=Failure&from=2026-04-18T00:00:00Z&to=2026-04-19T00:00:00Z" \
  -H "Authorization: Bearer <jwt>"
```

**Example — all events for a specific user:**
```bash
curl "http://localhost:5163/api/admin/audit-logs?userId=<user-id>&pageSize=100" \
  -H "Authorization: Bearer <jwt>"
```

**Example — all events for a specific merchant:**
```bash
curl "http://localhost:5163/api/admin/audit-logs?merchantId=<merchant-id>" \
  -H "Authorization: Bearer <jwt>"
```

**Response shape** (`PagedResult<AuditLogResponse>`):
```json
{
  "items": [
    {
      "id":          "f5b35e40-18b7-422c-824e-1496c30495a8",
      "action":      "Document.SignatureSubmitted",
      "entityType":  "Document",
      "entityId":    "0cc06a3f-aba3-42c2-a60b-748ea1eb74cb",
      "userId":      "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "merchantId":  "7cb5e4a1-1111-2222-3333-000000000001",
      "status":      "Success",
      "description": "Signature submitted by Bob Jones (bob@example.com)",
      "ipAddress":   "::1",
      "userAgent":   "Mozilla/5.0 ...",
      "metadata":    "{\"claimantName\":\"Bob Jones\",\"claimantEmail\":\"bob@example.com\",\"merchantId\":\"...\"}",
      "timestamp":   "2026-04-19T00:35:59Z"
    }
  ],
  "totalCount": 142,
  "page":       1,
  "pageSize":   50,
  "totalPages": 3
}
```

**`action` values**
| Value | Trigger |
|---|---|
| `Envelope.Created` | New envelope sent |
| `Envelope.Sent` | Invitation emails dispatched |
| `Envelope.Viewed` | Signer opened portal |
| `Envelope.Signed` | Single signer completed |
| `Envelope.Completed` | All signers done |
| `Envelope.Cancelled` | Envelope cancelled by sender |
| `Envelope.Rejected` | A signer explicitly rejected the document |
| `Envelope.Failed` | System error during send or stamping |
| `Envelope.Expired` | Signing window elapsed without completion |
| `Document.Uploaded` | Document attached to envelope |
| `Document.Stamped` | Signature stamped on document |
| `Document.SignatureSubmitted` | Signer submitted signature |
| `User.Registered` | New user registration |
| `User.LoggedIn` | Successful login |
| `User.LoginFailed` | Failed login attempt |
| `User.EmailVerified` | Email address confirmed |
| `User.PasswordResetRequested` | Forgot-password triggered |
| `User.PasswordReset` | Password changed via reset link |
| `User.Updated` | Profile updated |
| `Merchant.Created` | Merchant account created |
| `Merchant.Updated` | Merchant settings changed |
| `Merchant.ApiKeyRegenerated` | API key rotated |
| `Merchant.LimitUpdated` | Request limit changed |
| `Ticket.Created` | Support ticket opened |
| `Ticket.Updated` | Ticket fields changed |
| `Ticket.Replied` | Message added |
| `Ticket.Closed` | Ticket closed |
| `Ticket.Resolved` | Ticket resolved |
| `Portal.Opened` | Signing portal page viewed |

---

### Get Entity Timeline  — all events for one entity
```bash
curl "http://localhost:5163/api/admin/audit-logs/entity/Envelope/<envelope-id>" \
  -H "Authorization: Bearer <jwt>"
```
```bash
curl "http://localhost:5163/api/admin/audit-logs/entity/Document/<document-id>" \
  -H "Authorization: Bearer <jwt>"
```
> Returns `AuditLogResponse[]` ordered oldest → newest for the given entity.  
> Useful for a full signing history of a single envelope or document.

Valid `entityType` values: `Envelope` | `Document` | `User` | `Merchant` | `Ticket` | `Portal`

---

## Webhooks

> All webhook endpoints require **`Authorization: Bearer <jwt>`**.  
> The authenticated user must **own** the merchant (same `userId`).

Webhooks deliver a signed HTTP POST to your endpoint whenever a subscribed event fires.  
Each request includes:

| Header | Value |
|---|---|
| `Content-Type` | `application/json` |
| `X-DocSigner-Signature` | HMAC-SHA256 hex digest of the raw body, using the webhook secret |
| `X-DocSigner-Event` | Event name, e.g. `envelope.completed` |

**Signature verification (PowerShell)**
```powershell
$secret  = [System.Text.Encoding]::UTF8.GetBytes("<your-secret>")
$payload = [System.Text.Encoding]::UTF8.GetBytes($rawBody)
$hmac    = [System.Security.Cryptography.HMACSHA256]::new($secret)
$sig     = [BitConverter]::ToString($hmac.ComputeHash($payload)).Replace("-","").ToLower()
# $sig must equal the value in X-DocSigner-Signature
```

**Signature verification (bash)**
```bash
echo -n "$RAW_BODY" | openssl dgst -sha256 -hmac "<your-secret>" | awk '{print $2}'
# Compare result with X-DocSigner-Signature header
```

**Retry policy** — Failed deliveries are retried up to 5 times with exponential back-off:
1 min → 5 min → 15 min → 1 hr → 24 hr. 4xx responses are not retried.

---

### Supported Events

| Event | Trigger |
|---|---|
| `envelope.processing` | Envelope accepted, preparing invitation send |
| `envelope.sent` | Invitation emails dispatched to all signers |
| `envelope.signed` | One signer completed (multi-signer envelope in progress) |
| `envelope.completed` | All signers completed |
| `envelope.failed` | System error during send or document stamping |
| `envelope.expired` | Signing window elapsed without completion |
| `envelope.rejected` | A signer explicitly rejected the document |
| `envelope.cancelled` | Sender cancelled the envelope |
| `ticket.created` | Support ticket opened by a user |
| `ticket.replied` | Message added to an existing ticket |

---

### Register Webhook  ✅ Required: merchantId, url, events[]
```bash
curl -X POST http://localhost:5163/api/webhooks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt>" \
  -d '{
    "merchantId": "<merchant-id>",
    "url": "https://example.com/webhooks/docsigner",
    "events": [
      "envelope.sent",
      "envelope.completed",
      "envelope.rejected",
      "envelope.cancelled",
      "ticket.created"
    ]
  }'
```
> Returns `201 Created`.  
> **Save the `secret` field immediately — it is shown only once.**  
> `url` must be an absolute `http://` or `https://` URL.  
> Pass any subset of the supported events listed above.

**Response shape**
```json
{
  "id":        "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "merchantId":"7cb5e4a1-1111-2222-3333-000000000001",
  "url":       "https://example.com/webhooks/docsigner",
  "secret":    "base64-encoded-32-byte-random-secret==",
  "isActive":  true,
  "events":    ["envelope.sent","envelope.completed","envelope.rejected","envelope.cancelled","ticket.created"],
  "createdAt": "2026-04-19T10:00:00Z"
}
```

**Example payload delivered to your endpoint**
```json
{
  "event":     "envelope.completed",
  "timestamp": "2026-04-19T12:34:56Z",
  "data": {
    "envelopeId": "0cc06a3f-aba3-42c2-a60b-748ea1eb74cb",
    "status":     "Completed"
  }
}
```

---

### List Webhooks for a Merchant  ✅ Required: merchantId (query)
```bash
curl "http://localhost:5163/api/webhooks?merchantId=<merchant-id>" \
  -H "Authorization: Bearer <jwt>"
```
> Returns `WebhookResponse[]` for the given merchant.

---

### Delete Webhook  ✅ Required: id (URL path)
```bash
curl -X DELETE http://localhost:5163/api/webhooks/<webhook-id> \
  -H "Authorization: Bearer <jwt>"
```
> Returns `204 No Content`. Permanently removes the webhook and all delivery history.

---

### Get Delivery History  ✅ Required: id (URL path)  |  ❌ Optional: page, pageSize
```bash
curl "http://localhost:5163/api/webhooks/<webhook-id>/deliveries?page=1&pageSize=20" \
  -H "Authorization: Bearer <jwt>"
```
> Returns paged delivery attempts, newest first.

**Query parameters**
| Parameter | Type | Default | Notes |
|---|---|---|---|
| `page` | int | `1` | 1-based page number |
| `pageSize` | int | `20` | Results per page |

**Response shape**
```json
{
  "totalCount": 42,
  "page":       1,
  "pageSize":   20,
  "totalPages": 3,
  "items": [
    {
      "id":          "uuid",
      "webhookId":   "uuid",
      "eventName":   "envelope.completed",
      "status":      "Success",
      "retryCount":  0,
      "response":    "200 OK",
      "lastAttempt": "2026-04-19T12:34:57Z",
      "nextAttempt": "2026-04-19T12:34:57Z",
      "createdAt":   "2026-04-19T12:34:56Z"
    }
  ]
}
```

**`status` values**
| Status | Meaning |
|---|---|
| `Pending` | Queued, not yet attempted |
| `Processing` | Currently being delivered |
| `Success` | Endpoint returned 2xx |
| `Failed` | All retries exhausted or non-retryable 4xx received |

---

---

## Signer Contacts

> All signer contact endpoints require **`Authorization: Bearer <jwt>`**.  
> Contacts are scoped to the authenticated user.  
> Envelope creation automatically upserts contacts for each signer.

### List All Contacts  — all active contacts for the current user
```bash
curl http://localhost:5163/api/signer-contacts \
  -H "Authorization: Bearer <jwt>"
```
> Returns `SignerContactResponse[]` sorted by `Name` ascending.

**Response shape**
```json
[
  {
    "id":        "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "userId":    "<user-id>",
    "name":      "Bob Jones",
    "email":     "bob@example.com",
    "role":      "Signer",
    "phone":     "+1-555-0100",
    "company":   "Acme Corp",
    "isActive":  true,
    "createdAt": "2026-04-19T10:00:00Z",
    "updatedAt": "2026-04-19T10:00:00Z"
  }
]
```

---

### Search Contacts  ✅ Required: query (query string)
```bash
curl "http://localhost:5163/api/signer-contacts/search?query=bob" \
  -H "Authorization: Bearer <jwt>"
```
> Case-insensitive substring match on `Name` and `Email`. Returns up to 10 results.  
> Designed for use in autocomplete dropdowns on the send form.

---

### Create Contact  ✅ Required: name, email  |  ❌ Optional: role, phone, company
```bash
curl -X POST http://localhost:5163/api/signer-contacts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt>" \
  -d '{
    "name":    "Bob Jones",
    "email":   "bob@example.com",
    "role":    "Signer",
    "phone":   "+1-555-0100",
    "company": "Acme Corp"
  }'
```
> Returns `201 Created` with the new `SignerContactResponse`.  
> `role` defaults to `"signer"` if omitted.  
> Returns `409 Conflict` if a contact with the same email already exists for this user.

**Body fields**
| Field | Required | Notes |
|---|---|---|
| `name` | ✅ | Full name |
| `email` | ✅ | Must be unique per user |
| `role` | ❌ | Default: `"signer"` |
| `phone` | ❌ | Optional phone number |
| `company` | ❌ | Optional company name |

---

### Update Contact  ✅ Required: id (URL path), name, email, role, isActive
```bash
curl -X PUT http://localhost:5163/api/signer-contacts/<contact-id> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt>" \
  -d '{
    "name":     "Robert Jones",
    "email":    "robert@example.com",
    "role":     "Counter-Signer",
    "phone":    "+1-555-0101",
    "company":  "Acme Corp",
    "isActive": true
  }'
```
> Returns `200 OK` with the updated `SignerContactResponse`.  
> Returns `404 Not Found` if the contact does not exist or belongs to another user.

**Body fields**
| Field | Required | Notes |
|---|---|---|
| `name` | ✅ | Full name |
| `email` | ✅ | Must remain unique per user |
| `role` | ✅ | Role string |
| `phone` | ❌ | Pass `null` to clear |
| `company` | ❌ | Pass `null` to clear |
| `isActive` | ✅ | `false` to soft-disable the contact |

---

### Delete Contact  ✅ Required: id (URL path)
```bash
curl -X DELETE http://localhost:5163/api/signer-contacts/<contact-id> \
  -H "Authorization: Bearer <jwt>"
```
> Returns `204 No Content`. Performs a **soft-delete** — sets `isActive = false`.  
> Returns `404 Not Found` if the contact does not exist or belongs to another user.

---

### Import Contacts from CSV  ✅ Required: file (multipart/form-data)
```bash
curl -X POST http://localhost:5163/api/signer-contacts/import \
  -H "Authorization: Bearer <jwt>" \
  -F "file=@contacts.csv;type=text/csv"
```
> Parses uploaded CSV and upserts each row. Existing contacts (matched by email) are updated; new ones are created.  
> Returns `200 OK` with an import summary.

**CSV format** — first row must be a header row:
```
name,email,role,phone,company
Bob Jones,bob@example.com,Signer,+1-555-0100,Acme Corp
Carol White,carol@example.com,Counter-Signer,,
```

| Column | Required | Notes |
|---|---|---|
| `name` | ✅ | Full name |
| `email` | ✅ | Used as unique key per user |
| `role` | ❌ | Defaults to `"signer"` if blank |
| `phone` | ❌ | May be blank |
| `company` | ❌ | May be blank |

**Response shape**
```json
{
  "imported": 8,
  "skipped":  1,
  "failed":   1,
  "errors":   ["Row 4: invalid email format"]
}
```

| Field | Type | Notes |
|---|---|---|
| `imported` | int | Rows successfully created or updated |
| `skipped` | int | Rows with no changes (already up-to-date) |
| `failed` | int | Rows that could not be processed |
| `errors` | string[] | Per-row error descriptions |

**Generate a sample CSV (PowerShell):**
```powershell
"name,email,role,phone,company`nBob Jones,bob@example.com,Signer,+1-555-0100,Acme Corp" | Out-File contacts.csv -Encoding utf8
```

---

### Export Contacts as CSV  — download all contacts for the current user
```bash
curl http://localhost:5163/api/signer-contacts/export \
  -H "Authorization: Bearer <jwt>" \
  --output contacts.csv
```
> Returns a `text/csv` file named `signer-contacts.csv`.  
> Includes all active **and** inactive contacts.

**CSV columns in exported file:** `Name`, `Email`, `Role`, `Phone`, `Company`, `IsActive`, `CreatedAt`

---

## Quick Workflow (end-to-end test sequence)

```
1.  POST /api/auth/register                              → create user + auto-creates default merchant (if none exists)
2.  GET  /api/auth/verify-email/:t                       → verify email (token from email)
3.  POST /api/auth/login                                 → get JWT, note userId from `sub` claim
4.  GET  /api/merchants/by-user/:userId                  → list merchant(s), note apiKey + merchantId
    (optional) POST /api/merchants                       → create an additional merchant for the same user
5.  POST /api/envelopes                                  → create envelope (X-Api-Key header)
                                                           → signer contacts auto-created for each signer
6.  GET  /api/envelopes/:id                              → confirm status = "Sent"
7.  GET  /api/portal/validate/:t                         → signer validates token (t from email)
8a. POST /api/portal/submit/:t                           → signer submits signature (happy path)
8b. POST /api/portal/reject/:t                           → signer rejects the document (sets envelope → Rejected)
    (alt) PUT /api/envelopes/:id/cancel                  → sender cancels envelope before completion (Processing|Sent|Signed)
9.  GET  /api/envelopes/:id/signed-documents             → download signed doc (base64)

── Signer portal ────────────────────────────────────────────────────────────────
10. GET  /api/portal/my-envelopes                        → signer views all their pending/completed envelopes (JWT)
    → use signingToken from response to build signing URL: /sign/<signingToken>

── Signer Contacts ───────────────────────────────────────────────────────────────
11. GET  /api/signer-contacts                            → list all saved contacts (JWT)
12. GET  /api/signer-contacts/search?query=bob           → autocomplete search by name or email (JWT)
13. POST /api/signer-contacts                            → add a new contact manually (JWT)
14. PUT  /api/signer-contacts/:id                        → update a contact (JWT)
15. DELETE /api/signer-contacts/:id                      → soft-delete a contact (JWT)
16. POST /api/signer-contacts/import                     → bulk import from CSV file (JWT)
17. GET  /api/signer-contacts/export                     → download all contacts as CSV (JWT)

── Tickets ──────────────────────────────────────────────────────────────────────
18. POST /api/tickets                                    → user raises a Bug / Feedback / FeatureRequest
19. GET  /api/tickets/my                                 → user lists their own tickets
20. POST /api/tickets/:id/message                        → user adds a follow-up message
21. GET  /api/admin/tickets                              → admin lists all tickets  (Admin JWT)
22. PUT  /api/admin/tickets/:id/status                   → admin sets status + priority  (Admin JWT)
23. POST /api/tickets/:id/message (admin JWT)            → admin replies to the ticket

── Audit Logs ───────────────────────────────────────────────────────────────────
24. GET  /api/admin/audit-logs                           → admin views paged audit log  (Admin JWT)
25. GET  /api/admin/audit-logs?userId=:id                → all activity for a specific user (envelope lifecycle, logins, etc.)
26. GET  /api/admin/audit-logs?merchantId=:id            → all events for a specific merchant
27. GET  /api/admin/audit-logs?action=Envelope.Rejected  → all rejected envelopes across the platform
28. GET  /api/admin/audit-logs?action=Envelope.Cancelled → all cancelled envelopes
29. GET  /api/admin/audit-logs/entity/Envelope/:id       → full signing timeline for one envelope
30. GET  /api/admin/audit-logs/entity/Document/:id       → stamp/signature history for one document
```

