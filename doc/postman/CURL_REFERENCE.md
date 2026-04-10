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
    "name": "Alice Smith",
    "email": "alice@example.com",
    "password": "Secret1!",
    "country": "US",
    "accessRole": null
  }'
```

### Login  ✅ Required: email, password
```bash
curl -X POST http://localhost:5163/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "Secret1!"
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
  -d '{ "email": "alice@example.com" }'
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

### Create Merchant  ✅ Required: name, email, requestLimit
```bash
curl -X POST http://localhost:5163/api/merchants \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Corp",
    "email": "billing@acme.com",
    "requestLimit": 100
  }'
```
> `requestLimit`: `0` = unlimited. Response contains `id` (merchantId) and `apiKey`.

### Get All Merchants
```bash
curl http://localhost:5163/api/merchants
```

### Get Merchant by ID  ✅ Required: id (URL path)
```bash
curl http://localhost:5163/api/merchants/<merchant-id>
```

### Update Merchant  ✅ Required: isActive, requestLimit  |  ❌ Optional: name, email, subscriptionEnd
```bash
curl -X PUT http://localhost:5163/api/merchants/<merchant-id> \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Corp Updated",
    "email": "newbilling@acme.com",
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

## Quick Workflow (end-to-end test sequence)

```
1.  POST /api/auth/register          → create user
2.  GET  /api/auth/verify-email/:t   → verify email (token from email)
3.  POST /api/auth/login             → get JWT
4.  POST /api/merchants              → create merchant, note apiKey + id
5.  POST /api/envelopes              → create envelope (X-Api-Key header)
6.  GET  /api/envelopes/:id          → confirm status = "Sent"
7.  GET  /api/portal/validate/:t     → signer validates token (t from email)
8.  POST /api/portal/submit/:t       → signer submits signature
9.  GET  /api/envelopes/:id/signed-documents → download signed doc (base64)
```
