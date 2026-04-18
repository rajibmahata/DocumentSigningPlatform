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

---

## Portal (Signing Flow)
> No auth header needed. Token is in the URL path.  
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

### Platform Summary  — counts for users, envelopes and signed documents
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
>   "totalDocumentsSigned": 211
> }
> ```

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
>   "documentsSigned":    [{ "date": "2026-03-15", "count": 6 }, "..."]
> }
> ```
> `days`: valid range 7–90. Returns one entry per day that had activity.

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

## Quick Workflow (end-to-end test sequence)

```
1.  POST /api/auth/register                         → create user + auto-creates default merchant (if none exists)
2.  GET  /api/auth/verify-email/:t                  → verify email (token from email)
3.  POST /api/auth/login                            → get JWT, note userId from `sub` claim
4.  GET  /api/merchants/by-user/:userId             → list merchant(s), note apiKey + merchantId
    (optional) POST /api/merchants                  → create an additional merchant for the same user
5.  POST /api/envelopes                             → create envelope (X-Api-Key header)
6.  GET  /api/envelopes/:id                         → confirm status = "Sent"
7.  GET  /api/portal/validate/:t                    → signer validates token (t from email)
8.  POST /api/portal/submit/:t                      → signer submits signature
9.  GET  /api/envelopes/:id/signed-documents        → download signed doc (base64)

── Tickets ─────────────────────────────────────────────────────────────────
10. POST /api/tickets                               → user raises a Bug / Feedback / FeatureRequest
11. GET  /api/tickets/my                            → user lists their own tickets
12. POST /api/tickets/:id/message                   → user adds a follow-up message
13. GET  /api/admin/tickets                         → admin lists all tickets  (Admin JWT)
14. PUT  /api/admin/tickets/:id/status              → admin sets status + priority  (Admin JWT)
15. POST /api/tickets/:id/message (admin JWT)       → admin replies to the ticket
```
