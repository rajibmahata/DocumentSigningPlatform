'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, CheckCircle, ArrowLeft } from 'lucide-react';
import { apiBaseUrl, swaggerUrl } from '@/lib/config';

/* ── Types ── */
interface Param { name: string; type: string; required: boolean; description: string }
interface Endpoint {
  id: string;
  method: 'POST' | 'GET' | 'PUT' | 'DELETE';
  path: string;
  title: string;
  description: string;
  auth?: 'bearer' | 'api-key';
  headers?: Record<string, string>;
  body?: string;
  params?: Param[];
  response?: string;
}
interface WikiBlock {
  heading: string;
  body: string;
  table?: { headers: string[]; rows: string[][] };
  code?: { label: string; content: string };
}
interface Section { id: string; title: string; wiki?: WikiBlock[]; endpoints: Endpoint[] }

/* ── Data ── */
const SECTIONS: Section[] = [
  {
    id: 'auth', title: 'Authentication',
    wiki: [
      {
        heading: 'Overview',
        body: 'All protected endpoints use JWT Bearer authentication. Register an account, verify your email, then call Login to receive a token. Include it in every subsequent request via the Authorization: Bearer <token> header. Two access roles exist: User (default) and Admin.',
        table: {
          headers: ['Step', 'Endpoint', 'Notes'],
          rows: [
            ['1 — Register', 'POST /api/auth/register', 'Creates the account and sends a verification email'],
            ['2 — Verify email', 'GET /api/auth/verify-email/{token}', 'Must complete before first login'],
            ['3 — Login', 'POST /api/auth/login', 'Returns JWT token in response body'],
            ['4 — Call APIs', 'Any protected endpoint', 'Header: Authorization: Bearer <token>'],
          ],
        },
      },
      {
        heading: 'Quick Start — Register & Login',
        body: 'Register, verify your email, then login to obtain a Bearer token.',
        code: {
          label: 'curl',
          content: `# 1. Register
curl -X POST ${apiBaseUrl}/api/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Jane Doe","email":"jane@example.com","password":"Secure1234","country":"GB"}'

# 2. Verify email — click the link in the inbox or call the token URL
curl "${apiBaseUrl}/api/auth/verify-email/{token}"

# 3. Login — returns { token, userId, name, email }
curl -X POST ${apiBaseUrl}/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"jane@example.com","password":"Secure1234"}'

# 4. Use the token on protected routes
curl ${apiBaseUrl}/api/users \\
  -H "Authorization: Bearer eyJ..."`,
        },
      },
      {
        heading: 'Password Reset Flow',
        body: 'Request a reset email then submit the new password with the token from the email.',
        code: {
          label: 'curl',
          content: `# Step 1 — Send reset email
curl -X POST ${apiBaseUrl}/api/auth/forgot-password \\
  -H "Content-Type: application/json" \\
  -d '{"email":"jane@example.com"}'

# Step 2 — Reset password using the token from the email
curl -X POST ${apiBaseUrl}/api/auth/reset-password \\
  -H "Content-Type: application/json" \\
  -d '{"token":"uuid-from-email","newPassword":"NewPass123"}'`,
        },
      },
    ],
    endpoints: [
      {
        id: 'register', method: 'POST', path: '/api/auth/register',
        title: 'Register',
        description: 'Create a new user account. Sends a verification email.',
        body: JSON.stringify({ name: 'Jane Doe', email: 'jane@example.com', password: 'Secure1234', country: 'GB' }, null, 2),
        response: JSON.stringify({ id: 'uuid', name: 'Jane Doe', email: 'jane@example.com', isEmailVerified: false }, null, 2),
      },
      {
        id: 'login', method: 'POST', path: '/api/auth/login',
        title: 'Login',
        description: 'Authenticate and receive a JWT access token.',
        body: JSON.stringify({ email: 'jane@example.com', password: 'Secure1234' }, null, 2),
        response: JSON.stringify({ token: 'eyJ...', userId: 'uuid', name: 'Jane Doe', email: 'jane@example.com' }, null, 2),
      },
      {
        id: 'verify-email', method: 'GET', path: '/api/auth/verify-email/{token}',
        title: 'Verify Email',
        description: 'Activate email address using the token sent to the user\'s inbox.',
        params: [{ name: 'token', type: 'string', required: true, description: 'UUID token from the verification email' }],
        response: '<!-- Returns HTML confirmation page -->',
      },
      {
        id: 'forgot-password', method: 'POST', path: '/api/auth/forgot-password',
        title: 'Forgot Password',
        description: 'Send a password reset email to the specified address.',
        body: JSON.stringify({ email: 'jane@example.com' }, null, 2),
        response: JSON.stringify({ message: 'Reset email sent.' }, null, 2),
      },
      {
        id: 'reset-password', method: 'POST', path: '/api/auth/reset-password',
        title: 'Reset Password',
        description: 'Reset password using the token from the reset email.',
        body: JSON.stringify({ token: 'uuid', newPassword: 'NewPass123' }, null, 2),
        response: JSON.stringify({ message: 'Password reset successful.' }, null, 2),
      },
    ],
  },
  {
    id: 'users', title: 'Users',
    wiki: [
      {
        heading: 'Overview',
        body: 'User management endpoints require JWT Bearer authentication. The platform has two access roles: User (default) and Admin. Admins can list all users, look up any profile, and change roles. Regular users may only read and update their own profile.',
        table: {
          headers: ['Action', 'User', 'Admin'],
          rows: [
            ['List all users', '✗', '✓'],
            ['Get own profile', '✓', '✓'],
            ['Get any profile', '✗', '✓'],
            ['Update own name', '✓', '✓'],
            ['Change accessRole', '✗', '✓'],
          ],
        },
      },
      {
        heading: 'Quick Start',
        body: 'Fetch and update a user profile. Admin operations require an Admin-role token.',
        code: {
          label: 'curl',
          content: `# Get a user by ID
curl ${apiBaseUrl}/api/users/{id} \\
  -H "Authorization: Bearer eyJ..."

# Update display name
curl -X PUT ${apiBaseUrl}/api/users/{id} \\
  -H "Authorization: Bearer eyJ..." \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Jane Smith"}'

# Admin — promote a user to Admin role
curl -X PUT ${apiBaseUrl}/api/users/{id} \\
  -H "Authorization: Bearer eyJ..." \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Jane Smith","accessRole":"Admin"}'

# Admin — list all registered users
curl ${apiBaseUrl}/api/users \\
  -H "Authorization: Bearer eyJ..."`,
        },
      },
    ],
    endpoints: [
      {
        id: 'list-users', method: 'GET', path: '/api/users',
        title: 'List All Users',
        description: 'Return every registered user. Requires Admin role.',
        auth: 'bearer',
        response: JSON.stringify([{ id: 'uuid', name: 'Jane Doe', email: 'jane@example.com', accessRole: 'User', isEmailVerified: true, createdAt: '2026-01-01T00:00:00Z' }], null, 2),
      },
      {
        id: 'get-user', method: 'GET', path: '/api/users/{id}',
        title: 'Get User',
        description: 'Retrieve a user profile. Admins may look up any user; users may only look up themselves.',
        auth: 'bearer',
        params: [{ name: 'id', type: 'string', required: true, description: 'User UUID' }],
        response: JSON.stringify({ id: 'uuid', name: 'Jane Doe', email: 'jane@example.com', country: 'GB', isEmailVerified: true, accessRole: 'User', createdAt: '2026-01-01T00:00:00Z' }, null, 2),
      },
      {
        id: 'update-user', method: 'PUT', path: '/api/users/{id}',
        title: 'Update User',
        description: 'Update a user\'s name or access role. Only Admins can change accessRole.',
        auth: 'bearer',
        body: JSON.stringify({ name: 'Jane Smith', accessRole: 'Admin' }, null, 2),
        response: JSON.stringify({ id: 'uuid', name: 'Jane Smith', accessRole: 'Admin' }, null, 2),
      },
    ],
  },
  {
    id: 'analytics', title: 'Analytics',
    wiki: [
      {
        heading: 'Overview',
        body: 'Analytics endpoints are Admin-only and return platform-wide aggregate metrics. Use the summary endpoint for a total count snapshot. Use the trends endpoint to power time-series charts — it accepts a configurable look-back window of 7–90 days via the ?days= query parameter.',
        table: {
          headers: ['Endpoint', 'Returns', 'Auth'],
          rows: [
            ['GET /api/analytics/summary', 'All-time aggregate counts', 'Admin JWT'],
            ['GET /api/analytics/trends?days=N', 'Daily counts per metric (7–90 days)', 'Admin JWT'],
          ],
        },
      },
      {
        heading: 'Quick Start',
        body: 'Pull a platform snapshot and 7-day trend data in two requests.',
        code: {
          label: 'curl',
          content: `# Platform snapshot — all-time aggregates (Admin only)
curl ${apiBaseUrl}/api/analytics/summary \\
  -H "Authorization: Bearer eyJ..."
# Response: totalUsers, totalEnvelopesSent, totalDocumentsSigned,
#   totalTickets, openTickets, resolvedTickets, closedTickets, ...

# 7-day daily trends (Admin only)
curl "${apiBaseUrl}/api/analytics/trends?days=7" \\
  -H "Authorization: Bearer eyJ..."
# Response arrays: userRegistrations, envelopesSent,
#   documentsSigned, ticketsCreated
#   Each item: { date: "YYYY-MM-DD", count: number }`,
        },
      },
    ],
    endpoints: [
      {
        id: 'analytics-summary', method: 'GET', path: '/api/analytics/summary',
        title: 'Platform Summary',
        description: 'Returns aggregate counts for users, envelopes, signed documents, and support tickets across the platform. Requires Admin role.',
        auth: 'bearer',
        response: JSON.stringify({
          totalUsers: 42,
          totalEnvelopesSent: 130,
          totalEnvelopesSigned: 98,
          totalEnvelopesCancelled: 5,
          totalDocumentsSigned: 211,
          totalTickets: 18,
          openTickets: 4,
          inProgressTickets: 3,
          resolvedTickets: 8,
          closedTickets: 3,
        }, null, 2),
      },
      {
        id: 'analytics-trends', method: 'GET', path: '/api/analytics/trends',
        title: 'Daily Trends',
        description: 'Returns daily activity counts for user registrations, envelopes sent, and documents signed. Use the ?days= query param to control the look-back window (7–90 days, default 30). Requires Admin role.',
        auth: 'bearer',
        params: [{ name: 'days', type: 'integer', required: false, description: 'Look-back window: 7–90 (default 30)' }],
        response: JSON.stringify({
          userRegistrations: [{ date: '2026-03-15', count: 3 }, { date: '2026-03-16', count: 5 }],
          envelopesSent:     [{ date: '2026-03-15', count: 8 }, { date: '2026-03-16', count: 12 }],
          documentsSigned:   [{ date: '2026-03-15', count: 6 }, { date: '2026-03-16', count: 9 }],
          ticketsCreated:    [{ date: '2026-03-15', count: 2 }, { date: '2026-03-16', count: 1 }],
        }, null, 2),
      },
    ],
  },
  {
    id: 'merchants', title: 'Merchants',
    wiki: [
      {
        heading: 'Overview',
        body: 'A Merchant account is required to send envelopes and register webhooks. Creating a merchant generates an API key (mk_... prefix) authenticated via the X-Api-Key header. Each merchant has a configurable request limit — track usage in the requestUsed field returned on every response.',
        table: {
          headers: ['Concept', 'Detail'],
          rows: [
            ['API key prefix', 'mk_...'],
            ['Request header', 'X-Api-Key: mk_...'],
            ['Used for', 'POST/GET /api/envelopes, /api/webhooks'],
            ['Quota field', 'requestLimit — set at creation'],
            ['Usage field', 'requestUsed — increments per envelope sent'],
          ],
        },
      },
      {
        heading: 'Quick Start — Create a Merchant',
        body: 'Create a merchant with your user JWT, then use the returned API key for all envelope and webhook operations.',
        code: {
          label: 'curl',
          content: `# Create a merchant (requires JWT Bearer)
curl -X POST ${apiBaseUrl}/api/merchants \\
  -H "Authorization: Bearer eyJ..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "userId": "your-user-uuid",
    "name": "Acme Corp",
    "description": "Our signing integration",
    "requestLimit": 500
  }'
# Response includes apiKey: "mk_..." — save this

# Retrieve your merchants by user
curl ${apiBaseUrl}/api/merchants/by-user/{userId} \\
  -H "Authorization: Bearer eyJ..."

# Use the API key in envelope requests
curl -X POST ${apiBaseUrl}/api/envelopes \\
  -H "X-Api-Key: mk_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{...}'`,
        },
      },
    ],
    endpoints: [
      {
        id: 'create-merchant', method: 'POST', path: '/api/merchants',
        title: 'Create Merchant',
        description: 'Create a merchant account. Returns the merchant record including the API key.',
        auth: 'bearer',
        body: JSON.stringify({ userId: 'uuid', name: 'Acme Corp', description: 'Our signing integration', requestLimit: 100 }, null, 2),
        response: JSON.stringify({ id: 'uuid', name: 'Acme Corp', apiKey: 'mk_...', requestLimit: 100, requestUsed: 0, isActive: true }, null, 2),
      },
      {
        id: 'get-merchant-by-user', method: 'GET', path: '/api/merchants/by-user/{userId}',
        title: 'Get Merchant by User',
        description: 'Get all merchants belonging to a user.',
        auth: 'bearer',
        params: [{ name: 'userId', type: 'string', required: true, description: 'User UUID' }],
        response: JSON.stringify([{ id: 'uuid', apiKey: 'mk_...', requestUsed: 3 }], null, 2),
      },
      {
        id: 'get-merchant', method: 'GET', path: '/api/merchants/{id}',
        title: 'Get Merchant',
        description: 'Get a single merchant by ID.',
        auth: 'bearer',
        params: [{ name: 'id', type: 'string', required: true, description: 'Merchant UUID' }],
        response: JSON.stringify({ id: 'uuid', name: 'Acme Corp', apiKey: 'mk_...' }, null, 2),
      },
    ],
  },
  {
    id: 'envelopes', title: 'Envelopes',
    wiki: [
      {
        heading: 'Overview',
        body: 'An envelope packages one or more documents with a list of signers and dispatches invitation emails. Documents must be base64-encoded and contain a <<SIGNATURE>> text placeholder where the stamp is injected. Supported formats: PDF, Word DOC, and Word DOCX. All envelope operations authenticate via the merchant X-Api-Key header.',
        table: {
          headers: ['Status', 'Meaning', 'Terminal?'],
          rows: [
            ['Processing', 'Accepted — preparing invitation emails', 'No'],
            ['Sent', 'Invitation emails dispatched to all signers', 'No'],
            ['Signed', 'At least one signer has signed', 'No'],
            ['Completed', 'All signers have signed', 'Yes ✓'],
            ['Rejected', 'A signer rejected the document', 'Yes ✓'],
            ['Cancelled', 'Sender cancelled the envelope', 'Yes ✓'],
            ['Expired', 'Signing deadline passed without completion', 'Yes ✓'],
            ['Failed', 'Internal processing error', 'Yes ✓'],
          ],
        },
      },
      {
        heading: 'Document Requirements',
        body: 'Each document must contain the text <<SIGNATURE>> as a placeholder. During processing the system locates this marker and stamps the signer\'s drawn or typed signature image over it.',
        table: {
          headers: ['Format', 'documentContentType'],
          rows: [
            ['PDF', 'application/pdf'],
            ['Word DOC', 'application/msword'],
            ['Word DOCX', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
          ],
        },
      },
      {
        heading: 'Quick Start — Send an Envelope',
        body: 'Encode your PDF as base64 and POST to /api/envelopes using your merchant API key. The <<SIGNATURE>> placeholder in the document is replaced with the drawn signature.',
        code: {
          label: 'Node.js',
          content: `const fs    = require('fs');
const axios = require('axios');

// PDF must contain <<SIGNATURE>> placeholder
const pdfBase64 = fs.readFileSync('contract.pdf').toString('base64');

const { data } = await axios.post('${apiBaseUrl}/api/envelopes', {
  title:      'Service Agreement',
  merchantId: 'your-merchant-uuid',
  documents: [{
    documentTitle:       'Service Agreement',
    documentFileName:    'service-agreement.pdf',
    documentBase64:      pdfBase64,
    documentContentType: 'application/pdf',
  }],
  signers: [{
    name:    'John Doe',
    email:   'john@example.com',
    role:    'signer',
    order:   1,
    message: 'Please review and sign.',
  }],
}, { headers: { 'X-Api-Key': 'mk_your_api_key' } });

console.log('Envelope ID:', data.envelopeId);
console.log('Status:',      data.status);

// Cancel the envelope if needed
await axios.put(
  '${apiBaseUrl}/api/envelopes/' + data.envelopeId + '/cancel',
  {},
  { headers: { 'X-Api-Key': 'mk_your_api_key' } }
);`,
        },
      },
    ],
    endpoints: [
      {
        id: 'create-envelope', method: 'POST', path: '/api/envelopes',
        title: 'Initiate Envelope',
        description: 'Send a signing envelope. Requires a merchant API key. Documents must contain signature placeholders.',
        auth: 'api-key',
        headers: { 'X-Api-Key': 'YOUR_API_KEY', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Employment Contract',
          merchantId: 'merchant-uuid',
          documents: [{ documentTitle: 'Contract', documentFileName: 'contract.pdf', documentBase64: 'base64...', documentContentType: 'application/pdf' }],
          // also accepted: .doc / .docx with documentContentType 'application/msword' or 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          signers: [{ name: 'John Doe', email: 'john@example.com', role: 'signer', order: 1, message: 'Please sign.' }],
        }, null, 2),
        response: JSON.stringify({ envelopeId: 'uuid', title: 'Employment Contract', status: 'Pending', sentDate: '2025-01-01T00:00:00Z', signers: [{ signingToken: 'uuid', status: 'Pending' }] }, null, 2),
      },
      {
        id: 'cancel-envelope', method: 'PUT', path: '/api/envelopes/{id}/cancel',
        title: 'Cancel Envelope',
        description: 'Cancel an envelope, preventing further signing. Only envelopes in `Processing`, `Sent`, or `Signed` state can be cancelled. Returns 204 No Content.',
        auth: 'api-key',
        headers: { 'X-Api-Key': 'YOUR_API_KEY' },
        params: [{ name: 'id', type: 'string', required: true, description: 'Envelope UUID' }],
        response: '204 No Content',
      },
      {
        id: 'list-envelopes', method: 'GET', path: '/api/envelopes',
        title: 'List Envelopes',
        description: 'Get all envelopes for the authenticated merchant. **Status values:** `Processing` | `Sent` | `Signed` | `Completed` | `Failed` | `Cancelled` | `Expired` | `Rejected`',
        auth: 'api-key',
        headers: { 'X-Api-Key': 'YOUR_API_KEY' },
        response: JSON.stringify([{ envelopeId: 'uuid', title: 'Employment Contract', status: 'Sent' }], null, 2),
      },
      {
        id: 'get-envelope', method: 'GET', path: '/api/envelopes/{id}',
        title: 'Get Envelope',
        description: 'Get a single envelope including its signed document.',
        auth: 'api-key',
        headers: { 'X-Api-Key': 'YOUR_API_KEY' },
        params: [{ name: 'id', type: 'string', required: true, description: 'Envelope UUID' }],
        response: JSON.stringify({ envelopeId: 'uuid', signers: [{ signedDocumentBase64: 'base64_signed_doc...' }] }, null, 2),
      },
    ],
  },
  {
    id: 'tickets', title: 'Tickets',
    wiki: [
      {
        heading: 'Overview',
        body: 'The support ticket system lets users raise issues, feature requests, and feedback. Each ticket has a type, lifecycle status, and optional admin-set priority. Tickets support a threaded message history. Bug and FeatureRequest tickets accept a single base64 image attachment.',
        table: {
          headers: ['Field', 'Values'],
          rows: [
            ['type', 'Bug | Feedback | FeatureRequest'],
            ['status', 'Open → InProgress → Resolved → Closed'],
            ['priority', 'Low | Medium | High  (Admin-set only)'],
            ['Attachments', 'Bug and FeatureRequest only — image/jpeg, image/png, image/gif, image/webp'],
          ],
        },
      },
      {
        heading: 'Ticket Lifecycle',
        body: 'Users create tickets (status: Open). Admins triage them through the lifecycle. Both sides can add messages at any stage.',
        table: {
          headers: ['Transition', 'Who', 'Endpoint'],
          rows: [
            ['Created → Open', 'User', 'POST /api/tickets'],
            ['Open → InProgress', 'Admin', 'PUT /api/admin/tickets/{id}/status'],
            ['InProgress → Resolved', 'Admin', 'PUT /api/admin/tickets/{id}/status'],
            ['Resolved → Closed', 'Admin', 'PUT /api/admin/tickets/{id}/status'],
            ['Add message (any status)', 'User or Admin', 'POST /api/tickets/{id}/message'],
          ],
        },
      },
      {
        heading: 'Quick Start',
        body: 'Create a bug report, add a follow-up message, and triage it as an admin.',
        code: {
          label: 'curl',
          content: `# Create a bug ticket
curl -X POST ${apiBaseUrl}/api/tickets \\
  -H "Authorization: Bearer eyJ..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Login page crashes on mobile",
    "description": "Tapping login on iOS Safari shows a white screen.",
    "type": "Bug"
  }'

# Add a follow-up message
curl -X POST ${apiBaseUrl}/api/tickets/{id}/message \\
  -H "Authorization: Bearer eyJ..." \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Still reproducible on iOS 17.4."}'

# Admin — triage to InProgress with High priority
curl -X PUT ${apiBaseUrl}/api/admin/tickets/{id}/status \\
  -H "Authorization: Bearer eyJ..." \\
  -H "Content-Type: application/json" \\
  -d '{"status": "InProgress", "priority": "High"}'`,
        },
      },
    ],
    endpoints: [
      {
        id: 'create-ticket', method: 'POST', path: '/api/tickets',
        title: 'Create Ticket',
        description: 'Raise a new support ticket for the authenticated user. Status is automatically set to Open.\n\nAn optional image attachment (base64) can be included for Bug and FeatureRequest tickets only. Feedback tickets do not support attachments.\n\nSupported image types: image/jpeg · image/png · image/gif · image/webp',
        auth: 'bearer',
        body: JSON.stringify({ title: 'Login page crashes on mobile', description: 'Tapping the login button on iOS Safari causes a white screen.', type: 'Bug', attachmentBase64: '<base64-encoded-image — optional, Bug/FeatureRequest only>', attachmentContentType: 'image/png' }, null, 2),
        response: JSON.stringify({ id: 'uuid', userId: 'uuid', userName: 'Jane Doe', userEmail: 'jane@example.com', title: 'Login page crashes on mobile', description: '...', type: 'Bug', status: 'Open', priority: null, attachmentBase64: '<base64>', attachmentContentType: 'image/png', createdAt: '2026-04-18T10:00:00Z', updatedAt: null, messages: [] }, null, 2),
        params: [
          { name: 'title', type: 'string', required: true, description: 'Short summary of the issue' },
          { name: 'description', type: 'string', required: true, description: 'Full description' },
          { name: 'type', type: 'string', required: true, description: '`Bug` | `Feedback` | `FeatureRequest`' },
          { name: 'attachmentBase64', type: 'string', required: false, description: 'Base64-encoded image. Bug and FeatureRequest only.' },
          { name: 'attachmentContentType', type: 'string', required: false, description: 'MIME type: image/jpeg | image/png | image/gif | image/webp. Required when attachmentBase64 is provided.' },
        ],
      },
      {
        id: 'get-my-tickets', method: 'GET', path: '/api/tickets/my',
        title: 'Get My Tickets',
        description: 'Returns all tickets raised by the currently authenticated user, sorted by creation date descending.',
        auth: 'bearer',
        response: JSON.stringify([{ id: 'uuid', title: 'Login crash', type: 'Bug', status: 'Open', priority: null, messageCount: 2, createdAt: '2026-04-18T10:00:00Z', updatedAt: null }], null, 2),
      },
      {
        id: 'get-ticket', method: 'GET', path: '/api/tickets/{id}',
        title: 'Get Ticket by ID',
        description: 'Returns full ticket detail including all messages. Regular users may only access their own tickets (403 otherwise). Admins can access any ticket.',
        auth: 'bearer',
        params: [{ name: 'id', type: 'string', required: true, description: 'Ticket UUID' }],
        response: JSON.stringify({ id: 'uuid', title: 'Login crash', status: 'Open', messages: [{ id: 'uuid', senderType: 'User', message: 'Still happening.', createdAt: '2026-04-18T10:05:00Z' }] }, null, 2),
      },
      {
        id: 'add-message', method: 'POST', path: '/api/tickets/{id}/message',
        title: 'Add Message to Ticket',
        description: 'Appends a message to the ticket thread. `senderType` is set automatically — `User` for regular users, `Admin` for admin users.',
        auth: 'bearer',
        params: [{ name: 'id', type: 'string', required: true, description: 'Ticket UUID' }],
        body: JSON.stringify({ message: 'I can reproduce this consistently on iPhone 14 running iOS 17.' }, null, 2),
        response: JSON.stringify({ id: 'uuid', senderType: 'User', message: 'I can reproduce this consistently on iPhone 14 running iOS 17.', createdAt: '2026-04-18T10:06:00Z' }, null, 2),
      },
      {
        id: 'admin-get-all-tickets', method: 'GET', path: '/api/admin/tickets',
        title: 'Get All Tickets (Admin)',
        description: 'Returns all tickets across all users, sorted by creation date descending. Requires Admin role.',
        auth: 'bearer',
        response: JSON.stringify([{ id: 'uuid', userName: 'Jane Doe', userEmail: 'jane@example.com', title: 'Login crash', type: 'Bug', status: 'Open', priority: 'High', messageCount: 3, createdAt: '2026-04-18T10:00:00Z' }], null, 2),
      },
      {
        id: 'admin-update-status', method: 'PUT', path: '/api/admin/tickets/{id}/status',
        title: 'Update Ticket Status (Admin)',
        description: 'Updates ticket status and optionally sets priority. Returns 204 No Content. Requires Admin role.\n\nValid status: `Open` | `InProgress` | `Resolved` | `Closed`\nValid priority: `Low` | `Medium` | `High`',
        auth: 'bearer',
        params: [{ name: 'id', type: 'string', required: true, description: 'Ticket UUID' }],
        body: JSON.stringify({ status: 'InProgress', priority: 'High' }, null, 2),
        response: '204 No Content',
      },
    ],
  },
  {
    id: 'webhooks', title: 'Webhooks',
    wiki: [
      {
        heading: 'Overview',
        body: 'Webhooks let your server receive real-time HTTP POST notifications whenever events occur in your DocSignerHub account. Register an endpoint URL and select the events you care about — we deliver a signed JSON payload within seconds of each event. Each payload includes an X-DocSigner-Event header identifying the event type.',
      },
      {
        heading: 'Signature Verification',
        body: 'Every delivery includes an X-DocSigner-Signature header: an HMAC-SHA256 hex digest of the raw request body, computed with your webhook secret. Always verify this before processing the event. Compute the HMAC over the raw body bytes — do NOT re-serialize parsed JSON.',
        code: {
          label: 'Node.js',
          content: `const crypto = require('crypto');
const express = require('express');
const app = express();

// Use express.raw to capture the raw body buffer
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig      = req.headers['x-docsigner-signature'];
  const event    = req.headers['x-docsigner-event'];

  const expected = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(req.body)   // req.body is a Buffer here
    .digest('hex');

  if (sig !== expected) return res.status(401).send('Unauthorized');

  const payload = JSON.parse(req.body);
  console.log('Event:', event, payload.data);
  res.sendStatus(200);
});`,
        },
      },
      {
        heading: 'Request Headers',
        body: 'These headers are included on every webhook delivery:',
        table: {
          headers: ['Header', 'Description'],
          rows: [
            ['X-DocSigner-Signature', 'HMAC-SHA256 hex digest of the raw request body using your secret'],
            ['X-DocSigner-Event', 'Event name — e.g. envelope.completed'],
            ['Content-Type', 'application/json'],
          ],
        },
      },
      {
        heading: 'Retry Policy',
        body: 'If your endpoint returns a 5xx status or times out (30 s limit), delivery is retried up to 5 times with exponential back-off. 4xx responses are treated as permanent failures and are not retried.',
        table: {
          headers: ['Attempt', 'Delay after previous failure'],
          rows: [
            ['1 (initial)', 'Immediate'],
            ['2', '1 minute'],
            ['3', '5 minutes'],
            ['4', '15 minutes'],
            ['5', '1 hour'],
            ['6 (final)', '24 hours'],
          ],
        },
      },
      {
        heading: 'Available Events',
        body: 'Subscribe to any combination of these events when registering a webhook endpoint.',
        table: {
          headers: ['Event', 'When it fires'],
          rows: [
            ['envelope.processing', 'Envelope accepted, preparing to dispatch invitation emails'],
            ['envelope.sent', 'Invitation emails dispatched to all signers'],
            ['envelope.signed', 'One signer has completed their signature'],
            ['envelope.completed', 'All required signers have signed — envelope fully complete'],
            ['envelope.failed', 'Internal system error during envelope processing'],
            ['envelope.expired', 'Signing deadline passed without completion'],
            ['envelope.rejected', 'A signer explicitly rejected the document'],
            ['envelope.cancelled', 'Sender cancelled the envelope before completion'],
            ['ticket.created', 'New support ticket opened'],
            ['ticket.replied', 'A message was added to an existing support ticket'],
          ],
        },
      },
    ],
    endpoints: [
      {
        id: 'create-webhook', method: 'POST', path: '/api/webhooks',
        title: 'Register Webhook',
        description: 'Register a new webhook endpoint for a merchant. Returns the full webhook record including the generated signing secret. Save the secret immediately — it is not retrievable later.',
        auth: 'bearer',
        body: JSON.stringify({ merchantId: 'merchant-uuid', url: 'https://example.com/webhooks', events: ['envelope.completed', 'envelope.signed', 'ticket.created'] }, null, 2),
        response: JSON.stringify({ id: 'uuid', merchantId: 'merchant-uuid', url: 'https://example.com/webhooks', secret: 'whsec_...', events: ['envelope.completed', 'envelope.signed', 'ticket.created'], isActive: true, createdAt: '2026-04-19T12:00:00Z' }, null, 2),
      },
      {
        id: 'list-webhooks', method: 'GET', path: '/api/webhooks',
        title: 'List Webhooks by Merchant',
        description: 'Returns all registered webhooks for the specified merchant. Only the authenticated owner of the merchant account may access this.',
        auth: 'bearer',
        params: [{ name: 'merchantId', type: 'string', required: true, description: 'Merchant UUID (query parameter)' }],
        response: JSON.stringify([{ id: 'uuid', merchantId: 'merchant-uuid', url: 'https://example.com/webhooks', events: ['envelope.completed'], isActive: true, createdAt: '2026-04-19T12:00:00Z' }], null, 2),
      },
      {
        id: 'delete-webhook', method: 'DELETE', path: '/api/webhooks/{id}',
        title: 'Delete Webhook',
        description: 'Permanently delete a webhook and all its delivery history. Only the authenticated owner may delete their webhooks. Returns 204 No Content.',
        auth: 'bearer',
        params: [{ name: 'id', type: 'string', required: true, description: 'Webhook UUID' }],
        response: '204 No Content',
      },
      {
        id: 'webhook-deliveries', method: 'GET', path: '/api/webhooks/{id}/deliveries',
        title: 'Get Delivery History',
        description: 'Returns paginated delivery records for a specific webhook. Use this to inspect past delivery attempts, retry counts, HTTP response codes, and error messages.',
        auth: 'bearer',
        params: [
          { name: 'id',       type: 'string',  required: true,  description: 'Webhook UUID' },
          { name: 'page',     type: 'integer', required: false, description: 'Page number (default 1)' },
          { name: 'pageSize', type: 'integer', required: false, description: 'Items per page (default 20, max 100)' },
        ],
        response: JSON.stringify({
          items: [{ id: 'uuid', webhookId: 'webhook-uuid', eventName: 'envelope.completed', status: 'Success', retryCount: 0, lastAttempt: '2026-04-19T12:05:00Z', nextAttempt: null, response: 'HTTP 200', createdAt: '2026-04-19T12:04:55Z' }],
          page: 1, pageSize: 20, totalCount: 1, totalPages: 1,
        }, null, 2),
      },
      {
        id: 'test-webhook', method: 'POST', path: '/api/webhooks/{id}/test',
        title: 'Test Webhook (Ping)',
        description: 'Sends a live webhook.test ping to your registered endpoint. The request is signed with HMAC-SHA256 exactly like real events. Use this to verify your endpoint is reachable and signature verification is correctly implemented. Returns the HTTP status code, response body, and latency.',
        auth: 'bearer',
        params: [{ name: 'id', type: 'string', required: true, description: 'Webhook UUID' }],
        response: JSON.stringify({ success: true, statusCode: 200, durationMs: 42, body: 'OK' }, null, 2),
      },
    ],
  },
  {
    id: 'portal', title: 'Sign Portal',
    wiki: [
      {
        heading: 'Overview',
        body: 'The Sign Portal is the signer-facing side of the platform. Signers receive an email with a unique signing token. The token authenticates document load, signature submission, and rejection — no account is required. GET /api/portal/stats is fully public. Authenticated users can list all envelopes assigned to them as signers via /api/portal/my-envelopes.',
        table: {
          headers: ['Endpoint', 'Auth', 'Who uses it'],
          rows: [
            ['GET /portal/validate/{token}', 'None — token is the auth', 'Signing page on load'],
            ['POST /portal/submit/{token}', 'None — token is the auth', 'Signing page on submit'],
            ['POST /portal/reject/{token}', 'None — token is the auth', 'Signing page on reject'],
            ['GET /portal/my-envelopes', 'JWT Bearer', 'Dashboard — envelopes I must sign'],
            ['GET /portal/stats', 'None — public', 'Landing page stats widget'],
          ],
        },
      },
      {
        heading: 'Signing Flow',
        body: 'Complete end-to-end signing sequence. The signing token is embedded in the invitation email link.',
        table: {
          headers: ['Step', 'Action', 'API call'],
          rows: [
            ['1', 'Signer clicks the link in their invitation email', '— (token is in the URL)'],
            ['2', 'Page loads document preview and signer identity', 'GET /api/portal/validate/{token}'],
            ['3a', 'Signer draws/types signature and submits', 'POST /api/portal/submit/{token}'],
            ['3b', 'Or signer clicks Reject', 'POST /api/portal/reject/{token}'],
          ],
        },
      },
      {
        heading: 'Quick Start',
        body: 'Validate a signing token, submit a signature, or reject — all without authentication.',
        code: {
          label: 'curl',
          content: `# 1. Validate token — load document and signer identity
curl ${apiBaseUrl}/api/portal/validate/{signingToken}
# Response: signerName, signerEmail, documentTitle, documentBase64, message

# 2a. Submit signature (base64-encoded PNG of drawn/typed signature)
curl -X POST ${apiBaseUrl}/api/portal/submit/{signingToken} \\
  -H "Content-Type: application/json" \\
  -d '{"signatureBase64":"iVBORw0KGgoAAAANSUhEUgAA..."}'

# 2b. Reject the document (reason is optional)
curl -X POST ${apiBaseUrl}/api/portal/reject/{signingToken} \\
  -H "Content-Type: application/json" \\
  -d '{"reason":"Terms are not acceptable."}'

# 3. Authenticated users — list envelopes assigned to me as a signer
curl ${apiBaseUrl}/api/portal/my-envelopes \\
  -H "Authorization: Bearer eyJ..."

# 4. Public stats — no authentication required
curl ${apiBaseUrl}/api/portal/stats`,
        },
      },
    ],
    endpoints: [
      {
        id: 'validate-token', method: 'GET', path: '/api/portal/validate/{token}',
        title: 'Validate Signing Token',
        description: 'Called by the signing UI to load document preview and signer identity.',
        params: [{ name: 'token', type: 'string', required: true, description: 'Signing token UUID from the email link' }],
        response: JSON.stringify({ signerName: 'John Doe', signerEmail: 'john@example.com', documentTitle: 'Contract', documentBase64: 'base64...', message: 'Please sign.' }, null, 2),
      },
      {
        id: 'submit-signature', method: 'POST', path: '/api/portal/submit/{token}',
        title: 'Submit Signature',
        description: 'Submit the drawn or typed signature. The API stamps the document (PDF, DOC, or DOCX) and marks the request signed.',
        params: [{ name: 'token', type: 'string', required: true, description: 'Signing token UUID' }],
        body: JSON.stringify({ signatureBase64: 'base64_png...' }, null, 2),
        response: JSON.stringify({ message: 'Signature submitted successfully.' }, null, 2),
      },
      {
        id: 'reject-document', method: 'POST', path: '/api/portal/reject/{token}',
        title: 'Reject Document',
        description: 'Signer rejects the document. Sets the envelope status to `Rejected`. Token must still be valid (not expired). `reason` is optional.',
        params: [{ name: 'token', type: 'string', required: true, description: 'Signing token UUID from the email link' }],
        body: JSON.stringify({ reason: 'Terms are not acceptable.' }, null, 2),
        response: '204 No Content',
      },
      {
        id: 'my-envelopes', method: 'GET', path: '/api/portal/my-envelopes',
        title: 'Get My Envelopes',
        description: 'Returns all envelopes where the authenticated user (identified by the JWT email claim) is listed as a signer — both pending and historical. Use the `signingToken` field from each result to build the signing URL: `/sign/{signingToken}`.\n\n**Status values:** `Processing` | `Sent` | `Signed` | `Completed` | `Failed` | `Cancelled` | `Expired` | `Rejected`',
        auth: 'bearer',
        response: JSON.stringify([
          {
            envelopeId:    'uuid',
            title:         'Service Agreement – Q1 2026',
            status:        'Sent',
            createdAt:     '2026-04-18T10:00:00Z',
            createdByName: 'WestParc Law',
            signerRole:    'Signer',
            signingToken:  'abc123...token...',
            expiresAt:     '2026-04-25T10:00:00Z',
            documents: [
              { documentTitle: 'Service Agreement', documentFileName: 'service-agreement.pdf' },
            ],
          },
        ], null, 2),
      },
      {
        id: 'portal-stats', method: 'GET', path: '/api/portal/stats',
        title: 'Platform Stats',
        description: 'Public endpoint. Returns total envelopes sent and total documents signed across the platform.',
        response: JSON.stringify({ documentsSent: 130, documentsSigned: 98 }, null, 2),
      },
    ],
  },
  {
    id: 'signer-contacts', title: 'Signer Contacts',
    wiki: [
      {
        heading: 'Overview',
        body: 'Signer Contacts is your personal address book of frequent signers. Contacts are automatically created when you send an envelope and can be managed manually. The search endpoint powers the email autocomplete on the Send Envelope form.',
        table: {
          headers: ['Endpoint', 'Auth', 'Description'],
          rows: [
            ['GET /api/signer-contacts', 'Bearer', 'List all contacts for the authenticated user'],
            ['GET /api/signer-contacts/search?query=', 'Bearer', 'Autocomplete search by name or email'],
            ['POST /api/signer-contacts', 'Bearer', 'Create a new contact'],
            ['PUT /api/signer-contacts/{id}', 'Bearer', 'Update an existing contact'],
            ['DELETE /api/signer-contacts/{id}', 'Bearer', 'Delete a contact permanently'],
            ['GET /api/signer-contacts/export', 'Bearer', 'Export all contacts as a CSV file'],
            ['POST /api/signer-contacts/import', 'Bearer', 'Import contacts from a CSV file'],
          ],
        },
      },
      {
        heading: 'CSV Import Format',
        body: 'The CSV file must have a header row. Supported columns: name (required), email (required), role, phone, company. Extra columns are ignored.',
        code: {
          label: 'csv',
          content: `name,email,role,phone,company
Alice Smith,alice@example.com,signer,+44 7700 900000,Acme Ltd
Bob Jones,bob@example.com,reviewer,,`,
        },
      },
      {
        heading: 'Quick Start',
        body: 'List your contacts, search for one, and create a new one.',
        code: {
          label: 'curl',
          content: `# List all contacts
curl ${apiBaseUrl}/api/signer-contacts \\
  -H "Authorization: Bearer eyJ..."

# Search by name or email (autocomplete)
curl "${apiBaseUrl}/api/signer-contacts/search?query=alice" \\
  -H "Authorization: Bearer eyJ..."

# Create a contact
curl -X POST ${apiBaseUrl}/api/signer-contacts \\
  -H "Authorization: Bearer eyJ..." \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Alice Smith","email":"alice@example.com","role":"signer","phone":"+1 555 0100","company":"Acme Ltd"}'

# Export as CSV
curl ${apiBaseUrl}/api/signer-contacts/export \\
  -H "Authorization: Bearer eyJ..." \\
  --output contacts.csv

# Import from CSV
curl -X POST ${apiBaseUrl}/api/signer-contacts/import \\
  -H "Authorization: Bearer eyJ..." \\
  -F "file=@contacts.csv"`,
        },
      },
    ],
    endpoints: [
      {
        id: 'list-contacts', method: 'GET', path: '/api/signer-contacts',
        title: 'List Contacts',
        description: 'Returns all active signer contacts belonging to the authenticated user, sorted by name.',
        auth: 'bearer',
        response: JSON.stringify([{ id: 'uuid', name: 'Alice Smith', email: 'alice@example.com', role: 'signer', phone: '+44 7700 900000', company: 'Acme Ltd', isActive: true, createdAt: '2026-04-19T12:00:00Z' }], null, 2),
      },
      {
        id: 'search-contacts', method: 'GET', path: '/api/signer-contacts/search',
        title: 'Search Contacts',
        description: 'Case-insensitive substring match on name and email. Returns up to 10 results. Used for the email autocomplete on the Send Envelope form.',
        auth: 'bearer',
        params: [{ name: 'query', type: 'string', required: true, description: 'Partial name or email to search for' }],
        response: JSON.stringify([{ id: 'uuid', name: 'Alice Smith', email: 'alice@example.com', role: 'signer' }], null, 2),
      },
      {
        id: 'create-contact', method: 'POST', path: '/api/signer-contacts',
        title: 'Create Contact',
        description: 'Creates a new signer contact. Email must be unique per user — returns 409 Conflict if a contact with the same email already exists.',
        auth: 'bearer',
        body: JSON.stringify({ name: 'Alice Smith', email: 'alice@example.com', role: 'signer', phone: '+44 7700 900000', company: 'Acme Ltd' }, null, 2),
        response: JSON.stringify({ id: 'uuid', name: 'Alice Smith', email: 'alice@example.com', role: 'signer', phone: '+44 7700 900000', company: 'Acme Ltd', isActive: true, createdAt: '2026-04-19T12:00:00Z' }, null, 2),
      },
      {
        id: 'update-contact', method: 'PUT', path: '/api/signer-contacts/{id}',
        title: 'Update Contact',
        description: 'Replaces all writable fields for the contact. Set isActive to false to disable without deleting. Returns 404 if the contact does not belong to the caller.',
        auth: 'bearer',
        params: [{ name: 'id', type: 'string', required: true, description: 'Contact UUID' }],
        body: JSON.stringify({ name: 'Alice Smith', email: 'alice@example.com', role: 'signer', phone: '+44 7700 900000', company: 'Acme Ltd', isActive: true }, null, 2),
        response: JSON.stringify({ id: 'uuid', name: 'Alice Smith', email: 'alice@example.com', role: 'signer', isActive: true }, null, 2),
      },
      {
        id: 'delete-contact', method: 'DELETE', path: '/api/signer-contacts/{id}',
        title: 'Delete Contact',
        description: 'Permanently deletes a signer contact. Only the owning user may delete their contacts. Returns 204 No Content.',
        auth: 'bearer',
        params: [{ name: 'id', type: 'string', required: true, description: 'Contact UUID' }],
        response: '204 No Content',
      },
      {
        id: 'export-contacts', method: 'GET', path: '/api/signer-contacts/export',
        title: 'Export Contacts (CSV)',
        description: 'Downloads all contacts for the authenticated user as a UTF-8 CSV file. Content-Type is text/csv.',
        auth: 'bearer',
        response: 'text/csv file download — name,email,role,phone,company columns',
      },
      {
        id: 'import-contacts', method: 'POST', path: '/api/signer-contacts/import',
        title: 'Import Contacts (CSV)',
        description: 'Uploads a CSV file and bulk-creates contacts. Rows with duplicate emails for the user are skipped (not errors). Returns a summary of imported and skipped counts.',
        auth: 'bearer',
        body: 'multipart/form-data — field name: file (.csv)',
        response: JSON.stringify({ imported: 12, skipped: 2, errors: [] }, null, 2),
      },
    ],
  },
  {
    id: 'audit-logs', title: 'Audit Logs',
    wiki: [
      {
        heading: 'Overview',
        body: 'The audit log captures every significant action on the platform as a tamper-evident, hash-chained record. Each entry includes an HMAC-SHA256 integrity hash linked to the previous entry. Admin role is required for all audit log endpoints.',
        table: {
          headers: ['Field', 'Description'],
          rows: [
            ['action', 'What happened — e.g. Envelope.Completed, User.LoggedIn'],
            ['entityType', 'Which entity was affected — Envelope | Document | User | Merchant | Ticket | Portal'],
            ['entityId', 'UUID of the affected entity'],
            ['userId', 'UUID of the user who triggered the action (null for system actions)'],
            ['status', 'Success | Failure | Warning'],
            ['details', 'Human-readable description of the event'],
            ['ipAddress', 'IP address of the originating request'],
            ['hash', 'HMAC-SHA256 chain hash linking this entry to the previous one'],
          ],
        },
      },
      {
        heading: 'Supported Filter Values',
        body: 'Use these values in the query parameters to filter audit log results.',
        table: {
          headers: ['Parameter', 'Accepted values'],
          rows: [
            ['action', 'Envelope.Created, Envelope.Sent, Envelope.Signed, Envelope.Completed, Envelope.Cancelled, Envelope.Rejected, Envelope.Failed, Envelope.Expired, Document.Uploaded, Document.Stamped, Document.SignatureSubmitted, User.Registered, User.LoggedIn, User.LoginFailed, User.EmailVerified, User.PasswordResetRequested, User.PasswordReset, User.Updated, Merchant.Created, Merchant.Updated, Merchant.ApiKeyRegenerated, Merchant.LimitUpdated, Ticket.Created, Ticket.Updated, Ticket.Replied, Ticket.Closed, Ticket.Resolved, Portal.Opened'],
            ['entityType', 'Envelope | Document | User | Merchant | Ticket | Portal'],
            ['status', 'Success | Failure | Warning'],
          ],
        },
      },
      {
        heading: 'Quick Start',
        body: 'Query the paged audit log and retrieve the timeline for a specific entity.',
        code: {
          label: 'curl',
          content: `# Paged audit log — newest first
curl "${apiBaseUrl}/api/admin/audit-logs?page=1&pageSize=50" \\
  -H "Authorization: Bearer eyJ..."

# Filter by action and date range
curl "${apiBaseUrl}/api/admin/audit-logs?action=Envelope.Completed&from=2026-04-01&to=2026-04-30" \\
  -H "Authorization: Bearer eyJ..."

# Filter by entity type and ID
curl "${apiBaseUrl}/api/admin/audit-logs?entityType=Envelope&entityId=uuid" \\
  -H "Authorization: Bearer eyJ..."

# Entity timeline — all events for a specific entity
curl "${apiBaseUrl}/api/admin/audit-logs/timeline/uuid" \\
  -H "Authorization: Bearer eyJ..."`,
        },
      },
    ],
    endpoints: [
      {
        id: 'audit-log-list', method: 'GET', path: '/api/admin/audit-logs',
        title: 'Get Audit Log (Paged)',
        description: 'Returns a paged, filtered list of audit entries sorted newest-first. Requires Admin role. All query parameters are optional.',
        auth: 'bearer',
        params: [
          { name: 'action',     type: 'string',  required: false, description: 'Filter by action name' },
          { name: 'entityType', type: 'string',  required: false, description: 'Filter by entity type' },
          { name: 'entityId',   type: 'string',  required: false, description: 'Filter by entity UUID' },
          { name: 'userId',     type: 'string',  required: false, description: 'Filter by user UUID' },
          { name: 'merchantId', type: 'string',  required: false, description: 'Filter by merchant UUID' },
          { name: 'status',     type: 'string',  required: false, description: 'Success | Failure | Warning' },
          { name: 'from',       type: 'string',  required: false, description: 'Start date (UTC ISO-8601)' },
          { name: 'to',         type: 'string',  required: false, description: 'End date (UTC ISO-8601)' },
          { name: 'page',       type: 'integer', required: false, description: 'Page number (default 1)' },
          { name: 'pageSize',   type: 'integer', required: false, description: 'Results per page (default 50, max 200)' },
        ],
        response: JSON.stringify({ items: [{ id: 'uuid', action: 'Envelope.Completed', entityType: 'Envelope', entityId: 'env-uuid', userId: 'user-uuid', status: 'Success', details: 'Envelope completed', ipAddress: '1.2.3.4', createdAt: '2026-04-19T12:30:00Z' }], totalCount: 1, page: 1, pageSize: 50, totalPages: 1 }, null, 2),
      },
      {
        id: 'audit-log-timeline', method: 'GET', path: '/api/admin/audit-logs/timeline/{entityId}',
        title: 'Entity Timeline',
        description: 'Returns all audit log entries for a specific entity UUID, sorted oldest-first. Useful for reconstructing the complete history of an envelope, user, or merchant.',
        auth: 'bearer',
        params: [{ name: 'entityId', type: 'string', required: true, description: 'UUID of the entity to fetch history for' }],
        response: JSON.stringify([{ id: 'uuid', action: 'Envelope.Created', entityType: 'Envelope', entityId: 'env-uuid', status: 'Success', createdAt: '2026-04-19T10:00:00Z' }, { id: 'uuid2', action: 'Envelope.Sent', entityType: 'Envelope', entityId: 'env-uuid', status: 'Success', createdAt: '2026-04-19T10:01:00Z' }], null, 2),
      },
    ],
  },

  /* ═══════════════════════════════════════════════════
     PHASE 1 — AI & AUTOMATION FEATURES
     ═══════════════════════════════════════════════════ */

  {
    id: 'bulk-send', title: 'Bulk Send',
    wiki: [
      {
        heading: 'Overview',
        body: 'Bulk Send lets you dispatch up to 1 000 personalised envelopes in a single API call by uploading a CSV file. Every row in the CSV creates one envelope. You can track the entire batch via the batch ID returned on submission.',
        table: {
          headers: ['Endpoint', 'Auth', 'Description'],
          rows: [
            ['POST /api/envelopes/bulk', 'X-Api-Key', 'Create a bulk batch from a CSV file'],
            ['GET  /api/envelopes/bulk/{batchId}', 'X-Api-Key', 'Poll batch status and per-row results'],
          ],
        },
      },
      {
        heading: 'CSV Format',
        body: 'Each row becomes one envelope. Required columns: signerEmail, signerName, documentTitle, documentFileName. Optional: subject, message.',
        code: {
          label: 'csv',
          content: `signerEmail,signerName,documentTitle,documentFileName,subject,message
alice@example.com,Alice Smith,NDA Agreement,nda.pdf,Please sign your NDA,Hi Alice please review
bob@corp.com,Bob Jones,Service Contract,contract.pdf,,`,
        },
      },
      {
        heading: 'Quick Start',
        body: 'Submit a bulk batch and then poll for results.',
        code: {
          label: 'curl',
          content: `# Submit bulk batch (multipart/form-data)
curl -X POST ${apiBaseUrl}/api/envelopes/bulk \\
  -H "X-Api-Key: your-api-key" \\
  -F "csvFile=@recipients.csv" \\
  -F "subject=Please sign" \\
  -F "message=Your document is ready"

# Poll status
curl ${apiBaseUrl}/api/envelopes/bulk/{batchId} \\
  -H "X-Api-Key: your-api-key"`,
        },
      },
    ],
    endpoints: [
      {
        id: 'bulk-send-create', method: 'POST', path: '/api/envelopes/bulk',
        title: 'Create Bulk Batch',
        description: 'Accepts a multipart/form-data request containing a CSV file and common envelope settings. Creates one envelope per CSV row. Returns a batchId for tracking.',
        auth: 'api-key',
        headers: { 'X-Api-Key': 'your-merchant-api-key', 'Content-Type': 'multipart/form-data' },
        body: 'multipart/form-data — csvFile (.csv), subject (string), message (string)',
        response: JSON.stringify({ batchId: 'batch-uuid', totalRows: 250, queued: 250, status: 'Processing' }, null, 2),
      },
      {
        id: 'bulk-send-status', method: 'GET', path: '/api/envelopes/bulk/{batchId}',
        title: 'Get Batch Status',
        description: 'Returns the current status of a bulk batch: how many envelopes have been created, sent, failed, and a per-row breakdown.',
        auth: 'api-key',
        params: [{ name: 'batchId', type: 'string', required: true, description: 'Batch UUID returned by Create Bulk Batch' }],
        response: JSON.stringify({ batchId: 'batch-uuid', totalRows: 250, sent: 248, failed: 2, status: 'Completed', results: [{ row: 1, signerEmail: 'alice@example.com', envelopeId: 'env-uuid', status: 'Sent' }, { row: 2, signerEmail: 'bad@email', envelopeId: null, status: 'Failed', error: 'Invalid email' }] }, null, 2),
      },
    ],
  },

  {
    id: 'document-insights', title: 'Document Insights (AI)',
    wiki: [
      {
        heading: 'Overview',
        body: 'Document Insights uses GPT-4o-mini and computer vision to analyse uploaded documents. You can generate a plain-English summary of a contract, extract field positions for auto-placement, or run OCR to make scanned images searchable. All endpoints require the X-Api-Key merchant header.',
        table: {
          headers: ['Endpoint', 'Auth', 'Description'],
          rows: [
            ['GET  /api/documents/{id}/summary', 'X-Api-Key', 'Return cached AI summary (if exists)'],
            ['POST /api/documents/{id}/summary', 'X-Api-Key', 'Generate AI summary with GPT-4o-mini'],
            ['POST /api/documents/{id}/analyze', 'X-Api-Key', 'Analyse clauses and risk areas'],
            ['GET  /api/documents/{id}/fields',  'X-Api-Key', 'Return detected signature field positions'],
            ['POST /api/documents/{id}/fields',  'X-Api-Key', 'Trigger field detection (computer vision)'],
            ['POST /api/documents/{id}/ocr',     'X-Api-Key', 'Run OCR on scanned image/PDF'],
          ],
        },
      },
      {
        heading: 'Quick Start',
        body: 'Generate a summary and run OCR on a newly uploaded document.',
        code: {
          label: 'curl',
          content: `# Generate AI summary
curl -X POST ${apiBaseUrl}/api/documents/{docId}/summary \\
  -H "X-Api-Key: your-api-key"

# Get the cached summary
curl ${apiBaseUrl}/api/documents/{docId}/summary \\
  -H "X-Api-Key: your-api-key"

# Run OCR (for scanned PDFs or images)
curl -X POST ${apiBaseUrl}/api/documents/{docId}/ocr \\
  -H "X-Api-Key: your-api-key"

# Detect signature field positions
curl -X POST ${apiBaseUrl}/api/documents/{docId}/fields \\
  -H "X-Api-Key: your-api-key"`,
        },
      },
    ],
    endpoints: [
      {
        id: 'doc-summary-get', method: 'GET', path: '/api/documents/{id}/summary',
        title: 'Get Cached Summary',
        description: 'Returns the previously generated AI summary for this document. Returns 404 if no summary has been generated yet.',
        auth: 'api-key',
        params: [{ name: 'id', type: 'string', required: true, description: 'Document UUID' }],
        response: JSON.stringify({ documentId: 'doc-uuid', summary: 'This NDA agreement obligates both parties to maintain confidentiality for 3 years. Key clauses: non-disclosure (§2), non-solicitation (§5), jurisdiction: England & Wales (§12).', generatedAt: '2026-04-19T10:00:00Z' }, null, 2),
      },
      {
        id: 'doc-summary-post', method: 'POST', path: '/api/documents/{id}/summary',
        title: 'Generate AI Summary',
        description: 'Triggers GPT-4o-mini to read the document text and generate a plain-English summary highlighting obligations, risk areas, and key dates. Result is cached for subsequent GET calls.',
        auth: 'api-key',
        params: [{ name: 'id', type: 'string', required: true, description: 'Document UUID' }],
        response: JSON.stringify({ documentId: 'doc-uuid', summary: 'This is a 3-year NDA...', generatedAt: '2026-04-19T10:00:00Z' }, null, 2),
      },
      {
        id: 'doc-analyze', method: 'POST', path: '/api/documents/{id}/analyze',
        title: 'Analyse Document',
        description: 'Deeper clause-level analysis: identifies obligations, penalties, renewal auto-rollover clauses, and assigns a risk score.',
        auth: 'api-key',
        params: [{ name: 'id', type: 'string', required: true, description: 'Document UUID' }],
        response: JSON.stringify({ documentId: 'doc-uuid', riskScore: 42, clauses: [{ type: 'AutoRenewal', text: 'Agreement auto-renews unless cancelled 30 days prior', risk: 'Medium' }], analyzedAt: '2026-04-19T10:01:00Z' }, null, 2),
      },
      {
        id: 'doc-fields-get', method: 'GET', path: '/api/documents/{id}/fields',
        title: 'Get Detected Fields',
        description: 'Returns cached computer-vision field detection results: bounding boxes and types (signature, initials, date, checkbox) for each detected field.',
        auth: 'api-key',
        params: [{ name: 'id', type: 'string', required: true, description: 'Document UUID' }],
        response: JSON.stringify({ documentId: 'doc-uuid', fields: [{ type: 'Signature', page: 1, x: 120, y: 640, width: 200, height: 40 }], detectedAt: '2026-04-19T10:02:00Z' }, null, 2),
      },
      {
        id: 'doc-fields-post', method: 'POST', path: '/api/documents/{id}/fields',
        title: 'Trigger Field Detection',
        description: 'Triggers the computer-vision pipeline to scan the document for signature and form fields. Results are cached and returned by GET /fields.',
        auth: 'api-key',
        params: [{ name: 'id', type: 'string', required: true, description: 'Document UUID' }],
        response: JSON.stringify({ documentId: 'doc-uuid', fieldsDetected: 3 }, null, 2),
      },
      {
        id: 'doc-ocr', method: 'POST', path: '/api/documents/{id}/ocr',
        title: 'Run OCR',
        description: 'Runs optical character recognition on a scanned PDF or image-based document to extract machine-readable text. The extracted text is stored and used to power AI summary and analysis endpoints.',
        auth: 'api-key',
        params: [{ name: 'id', type: 'string', required: true, description: 'Document UUID' }],
        response: JSON.stringify({ documentId: 'doc-uuid', extractedTextLength: 4820, pagesProcessed: 5 }, null, 2),
      },
    ],
  },

  {
    id: 'payment', title: 'Payments (Stripe)',
    wiki: [
      {
        heading: 'Overview',
        body: 'The Payments API integrates with Stripe to collect payment from signers before or after they sign. Create a PaymentIntent via the API, redirect the signer to your Stripe checkout, and receive a webhook event when payment succeeds. The envelope can be configured to complete only after payment is confirmed.',
        table: {
          headers: ['Endpoint', 'Auth', 'Description'],
          rows: [
            ['POST /api/payments/intent',          'X-Api-Key', 'Create a Stripe PaymentIntent for an envelope'],
            ['POST /api/payments/stripe-webhook',  'None (Stripe sig)', 'Receive Stripe webhook events'],
            ['GET  /api/payments/{envelopeId}',    'X-Api-Key', 'Get payment status for an envelope'],
          ],
        },
      },
      {
        heading: 'Stripe Webhook Setup',
        body: 'Register https://your-domain.com/api/payments/stripe-webhook in your Stripe dashboard. The endpoint verifies the Stripe-Signature header using your webhook secret. Events handled: payment_intent.succeeded, payment_intent.payment_failed.',
        code: {
          label: 'bash',
          content: `# Register in Stripe Dashboard → Developers → Webhooks
# Endpoint URL: https://your-api-domain.com/api/payments/stripe-webhook
# Events to send: payment_intent.succeeded, payment_intent.payment_failed`,
        },
      },
      {
        heading: 'Quick Start',
        body: 'Create a payment intent, show Stripe checkout to the signer, then check payment status.',
        code: {
          label: 'curl',
          content: `# Create payment intent
curl -X POST ${apiBaseUrl}/api/payments/intent \\
  -H "X-Api-Key: your-api-key" \\
  -H "Content-Type: application/json" \\
  -d '{"envelopeId":"env-uuid","amountCents":4999,"currency":"gbp"}'

# Check payment status
curl ${apiBaseUrl}/api/payments/{envelopeId} \\
  -H "X-Api-Key: your-api-key"`,
        },
      },
    ],
    endpoints: [
      {
        id: 'payment-intent', method: 'POST', path: '/api/payments/intent',
        title: 'Create Payment Intent',
        description: 'Creates a Stripe PaymentIntent for the specified envelope and returns the clientSecret needed to render Stripe Elements or redirect to Stripe Checkout.',
        auth: 'api-key',
        body: JSON.stringify({ envelopeId: 'env-uuid', amountCents: 4999, currency: 'gbp' }, null, 2),
        response: JSON.stringify({ paymentId: 'pay-uuid', clientSecret: 'pi_xxx_secret_yyy', status: 'requires_payment_method' }, null, 2),
      },
      {
        id: 'payment-webhook', method: 'POST', path: '/api/payments/stripe-webhook',
        title: 'Stripe Webhook',
        description: 'Receives raw body webhook events from Stripe. Validates the Stripe-Signature header. On payment_intent.succeeded, marks the associated envelope payment as paid. Do NOT call this endpoint directly.',
        headers: { 'Stripe-Signature': 't=...,v1=...' },
        response: '200 OK — { "received": true }',
      },
      {
        id: 'payment-get', method: 'GET', path: '/api/payments/{envelopeId}',
        title: 'Get Payment Status',
        description: 'Returns the current payment record for an envelope: amount, currency, Stripe PaymentIntent ID, and status.',
        auth: 'api-key',
        params: [{ name: 'envelopeId', type: 'string', required: true, description: 'Envelope UUID' }],
        response: JSON.stringify({ id: 'pay-uuid', envelopeId: 'env-uuid', paymentIntentId: 'pi_xxx', amountCents: 4999, currency: 'gbp', status: 'Paid', createdAt: '2026-04-19T10:00:00Z', paidAt: '2026-04-19T10:05:00Z' }, null, 2),
      },
    ],
  },

  {
    id: 'branding', title: 'Branding',
    wiki: [
      {
        heading: 'Overview',
        body: 'The Branding API allows each merchant to white-label the signing experience. Set your own logo URL, primary colour, portal title, and custom email sender name. These settings are applied automatically when signers open the signing portal via your merchant API key.',
        table: {
          headers: ['Endpoint', 'Auth', 'Description'],
          rows: [
            ['GET /api/merchants/{merchantId}/branding', 'X-Api-Key', 'Get current branding settings'],
            ['PUT /api/merchants/{merchantId}/branding', 'X-Api-Key', 'Update branding settings'],
          ],
        },
      },
      {
        heading: 'Quick Start',
        body: 'Set your brand colour and logo URL.',
        code: {
          label: 'curl',
          content: `# Get current branding
curl ${apiBaseUrl}/api/merchants/{merchantId}/branding \\
  -H "X-Api-Key: your-api-key"

# Update branding
curl -X PUT ${apiBaseUrl}/api/merchants/{merchantId}/branding \\
  -H "X-Api-Key: your-api-key" \\
  -H "Content-Type: application/json" \\
  -d '{"primaryColor":"#7C3AED","logoUrl":"https://cdn.example.com/logo.png","portalTitle":"Acme Sign","emailSenderName":"Acme Contracts"}'`,
        },
      },
    ],
    endpoints: [
      {
        id: 'branding-get', method: 'GET', path: '/api/merchants/{merchantId}/branding',
        title: 'Get Branding',
        description: 'Returns the current branding configuration for the merchant.',
        auth: 'api-key',
        params: [{ name: 'merchantId', type: 'string', required: true, description: 'Merchant UUID' }],
        response: JSON.stringify({ merchantId: 'merch-uuid', primaryColor: '#7C3AED', logoUrl: 'https://cdn.example.com/logo.png', portalTitle: 'Acme Sign', emailSenderName: 'Acme Contracts', updatedAt: '2026-04-19T10:00:00Z' }, null, 2),
      },
      {
        id: 'branding-put', method: 'PUT', path: '/api/merchants/{merchantId}/branding',
        title: 'Update Branding',
        description: 'Creates or replaces the branding settings for the merchant. All fields are optional — omitted fields retain their current value.',
        auth: 'api-key',
        params: [{ name: 'merchantId', type: 'string', required: true, description: 'Merchant UUID' }],
        body: JSON.stringify({ primaryColor: '#7C3AED', logoUrl: 'https://cdn.example.com/logo.png', portalTitle: 'Acme Sign', emailSenderName: 'Acme Contracts' }, null, 2),
        response: JSON.stringify({ merchantId: 'merch-uuid', primaryColor: '#7C3AED', logoUrl: 'https://cdn.example.com/logo.png', portalTitle: 'Acme Sign', emailSenderName: 'Acme Contracts', updatedAt: '2026-04-19T12:00:00Z' }, null, 2),
      },
    ],
  },

  {
    id: 'feature-flags', title: 'Feature Flags',
    wiki: [
      {
        heading: 'Overview',
        body: 'Feature Flags let you enable or disable Phase 1 capabilities on a per-merchant basis. Use this to offer tiered plans: charge extra for AI analysis, blockchain notarisation, or Stripe payments without deploying separate code.',
        table: {
          headers: ['Feature Key', 'Description'],
          rows: [
            ['ai_summary',           'GPT-4o-mini contract summarisation'],
            ['ocr',                  'OCR on scanned documents'],
            ['bulk_send',            'Bulk CSV envelope dispatch'],
            ['blockchain',           'Polygon/Ethereum notarisation'],
            ['stripe_payments',      'Stripe payment gate before/after signing'],
            ['identity_verification','Government-ID confidence scoring'],
            ['white_label',          'Custom branding on signing portal'],
          ],
        },
      },
      {
        heading: 'Quick Start',
        body: 'List all feature flags for a merchant, then enable blockchain notarisation.',
        code: {
          label: 'curl',
          content: `# Get all feature flags
curl ${apiBaseUrl}/api/merchants/{merchantId}/features \\
  -H "X-Api-Key: your-api-key"

# Enable blockchain for this merchant
curl -X PUT ${apiBaseUrl}/api/merchants/{merchantId}/features/blockchain \\
  -H "X-Api-Key: your-api-key" \\
  -H "Content-Type: application/json" \\
  -d '{"enabled":true}'`,
        },
      },
    ],
    endpoints: [
      {
        id: 'features-list', method: 'GET', path: '/api/merchants/{merchantId}/features',
        title: 'List Feature Flags',
        description: 'Returns all feature flag keys and their enabled/disabled state for the specified merchant.',
        auth: 'api-key',
        params: [{ name: 'merchantId', type: 'string', required: true, description: 'Merchant UUID' }],
        response: JSON.stringify({ merchantId: 'merch-uuid', features: [{ key: 'ai_summary', enabled: true }, { key: 'blockchain', enabled: false }, { key: 'stripe_payments', enabled: true }] }, null, 2),
      },
      {
        id: 'features-update', method: 'PUT', path: '/api/merchants/{merchantId}/features/{featureKey}',
        title: 'Update Feature Flag',
        description: 'Enables or disables a single feature flag for the merchant. Use featureKey values from the table in the Guide section.',
        auth: 'api-key',
        params: [
          { name: 'merchantId', type: 'string', required: true, description: 'Merchant UUID' },
          { name: 'featureKey', type: 'string', required: true, description: 'Feature key e.g. blockchain, ai_summary' },
        ],
        body: JSON.stringify({ enabled: true }, null, 2),
        response: JSON.stringify({ merchantId: 'merch-uuid', featureKey: 'blockchain', enabled: true, updatedAt: '2026-04-19T12:00:00Z' }, null, 2),
      },
    ],
  },

  {
    id: 'verification', title: 'Identity Verification',
    wiki: [
      {
        heading: 'Overview',
        body: 'Identity Verification lets you require signers to upload a government-issued ID before signing. The AI pipeline scores confidence (0–100). Scores ≥ 80 are auto-approved; lower scores are queued for manual admin review. Merchants can review, approve, or reject pending verifications.',
        table: {
          headers: ['Endpoint', 'Auth', 'Description'],
          rows: [
            ['POST /api/verification/start',               'X-Api-Key', 'Submit a signer ID image for verification'],
            ['GET  /api/verification/{signingRequestId}',   'X-Api-Key', 'Get verification status for a signing request'],
            ['POST /api/verification/{id}/review',          'X-Api-Key', 'Approve or reject a pending verification (admin)'],
          ],
        },
      },
      {
        heading: 'Confidence Score',
        body: 'The AI assigns a confidence score from 0 to 100. ≥ 80 = auto-approved. < 80 = pending manual review. Admin calls POST /review to approve or reject.',
        table: {
          headers: ['Score Range', 'Status', 'Action Required'],
          rows: [
            ['80 – 100', 'Approved',         'None — signer may proceed'],
            ['50 – 79',  'PendingReview',     'Admin must call POST /review'],
            ['0 – 49',   'PendingReview',     'Admin must call POST /review'],
            ['—',        'Rejected',          'Signer must resubmit'],
          ],
        },
      },
      {
        heading: 'Quick Start',
        body: 'Start a verification by sending a base64-encoded ID image, then check the result.',
        code: {
          label: 'curl',
          content: `# Start verification (base64-encode the ID image first)
curl -X POST ${apiBaseUrl}/api/verification/start \\
  -H "X-Api-Key: your-api-key" \\
  -H "Content-Type: application/json" \\
  -d '{"signingRequestId":"req-uuid","documentType":"passport","idImageBase64":"<base64>"}'

# Check verification status
curl ${apiBaseUrl}/api/verification/{signingRequestId} \\
  -H "X-Api-Key: your-api-key"

# Admin: approve a pending verification
curl -X POST ${apiBaseUrl}/api/verification/{verificationId}/review \\
  -H "X-Api-Key: your-api-key" \\
  -H "Content-Type: application/json" \\
  -d '{"approved":true}'`,
        },
      },
    ],
    endpoints: [
      {
        id: 'verification-start', method: 'POST', path: '/api/verification/start',
        title: 'Start Verification',
        description: 'Submit a base64-encoded ID image for a signing request. The AI pipeline runs synchronously and returns the initial status and confidence score. Supported document types: passport, driving_licence, national_id.',
        auth: 'api-key',
        body: JSON.stringify({ signingRequestId: 'req-uuid', documentType: 'passport', idImageBase64: '/9j/4AAQSkZJRgAB...' }, null, 2),
        response: JSON.stringify({ verificationId: 'ver-uuid', status: 'Approved', confidenceScore: 92 }, null, 2),
      },
      {
        id: 'verification-get', method: 'GET', path: '/api/verification/{signingRequestId}',
        title: 'Get Verification Status',
        description: 'Returns the full verification record for a signing request, including document type, confidence score, and any rejection reason.',
        auth: 'api-key',
        params: [{ name: 'signingRequestId', type: 'string', required: true, description: 'Signing request UUID' }],
        response: JSON.stringify({ id: 'ver-uuid', signingRequestId: 'req-uuid', signerEmail: 'alice@example.com', documentType: 'passport', status: 'PendingReview', confidenceScore: 67, rejectionReason: null, createdAt: '2026-04-19T10:00:00Z', expiresAt: '2026-04-26T10:00:00Z' }, null, 2),
      },
      {
        id: 'verification-review', method: 'POST', path: '/api/verification/{id}/review',
        title: 'Review Verification (Admin)',
        description: 'Approves or rejects a verification that is in PendingReview state. Only accounts with Admin or MerchantAdmin role may call this endpoint. If rejecting, provide a rejectionReason.',
        auth: 'api-key',
        params: [{ name: 'id', type: 'string', required: true, description: 'Verification UUID' }],
        body: JSON.stringify({ approved: false, rejectionReason: 'Image quality too low — please resubmit' }, null, 2),
        response: JSON.stringify({ id: 'ver-uuid', status: 'Rejected', rejectionReason: 'Image quality too low — please resubmit', reviewedAt: '2026-04-19T12:00:00Z' }, null, 2),
      },
    ],
  },

  {
    id: 'blockchain', title: 'Blockchain Notarisation',
    wiki: [
      {
        heading: 'Overview',
        body: 'Blockchain Notarisation writes a SHA-256 hash of your completed envelope to an EVM-compatible blockchain (Polygon by default). This creates an immutable, publicly verifiable proof-of-existence. Anyone can verify the document has not been altered since signing by recalculating the hash and comparing it to the on-chain record.',
        table: {
          headers: ['Endpoint', 'Auth', 'Description'],
          rows: [
            ['GET  /api/envelopes/{envelopeId}/blockchain', 'X-Api-Key', 'Get blockchain record for a completed envelope'],
            ['POST /api/envelopes/{envelopeId}/blockchain', 'X-Api-Key', 'Notarise envelope on-chain (triggers transaction)'],
          ],
        },
      },
      {
        heading: 'How Verification Works',
        body: 'To independently verify a document: (1) download the signed document; (2) compute SHA-256 hash; (3) look up the txHash on a block explorer; (4) confirm the hash in the transaction data matches your computed hash. No trust in DocSignerHub is required.',
        code: {
          label: 'bash',
          content: `# Compute SHA-256 of the signed document
sha256sum signed-nda.pdf
# => a3f9...  signed-nda.pdf

# Compare with the hash returned by GET /blockchain
# => documentHash: "a3f9..."

# Verify on Polygonscan:
# https://polygonscan.com/tx/{txHash}`,
        },
      },
      {
        heading: 'Quick Start',
        body: 'Notarise a completed envelope and retrieve the transaction hash.',
        code: {
          label: 'curl',
          content: `# Notarise envelope on-chain
curl -X POST ${apiBaseUrl}/api/envelopes/{envelopeId}/blockchain \\
  -H "X-Api-Key: your-api-key"

# Get blockchain record
curl ${apiBaseUrl}/api/envelopes/{envelopeId}/blockchain \\
  -H "X-Api-Key: your-api-key"`,
        },
      },
    ],
    endpoints: [
      {
        id: 'blockchain-get', method: 'GET', path: '/api/envelopes/{envelopeId}/blockchain',
        title: 'Get Blockchain Record',
        description: 'Returns the blockchain notarisation record for a completed envelope: document hash, transaction hash, block number, and chain.',
        auth: 'api-key',
        params: [{ name: 'envelopeId', type: 'string', required: true, description: 'Envelope UUID' }],
        response: JSON.stringify({ envelopeId: 'env-uuid', documentHash: 'a3f9...', txHash: '0xabc123...', blockNumber: 45123456, chain: 'polygon', notarisedAt: '2026-04-19T10:05:00Z' }, null, 2),
      },
      {
        id: 'blockchain-post', method: 'POST', path: '/api/envelopes/{envelopeId}/blockchain',
        title: 'Notarise Envelope',
        description: 'Triggers an on-chain transaction to record the envelope document hash. The envelope must be in Completed status. Returns immediately with the pending transaction hash; confirmations happen asynchronously.',
        auth: 'api-key',
        params: [{ name: 'envelopeId', type: 'string', required: true, description: 'Envelope UUID (must be Completed)' }],
        response: JSON.stringify({ envelopeId: 'env-uuid', documentHash: 'a3f9...', txHash: '0xabc123...', status: 'Pending', chain: 'polygon' }, null, 2),
      },
    ],
  },
  {
    id: 'workflows', title: 'Workflow Engine',
    wiki: [
      {
        heading: 'Overview',
        body: 'The Workflow Engine lets you automate multi-step document signing processes using a visual drag-and-drop builder. Define a workflow as a directed graph of nodes and edges — the engine walks the graph sequentially, executing each node (email, approval, delay, AI action, webhook, etc.). All workflow endpoints require JWT Bearer authentication and are scoped to the authenticated merchant.',
        table: {
          headers: ['Concept', 'Detail'],
          rows: [
            ['Workflow Definition', 'The blueprint — nodes, edges, variables, and settings stored as JSON'],
            ['Workflow Instance', 'A single run of a definition — tracks current node, status, and context'],
            ['Node Execution', 'Per-node record: start time, end time, output, status'],
            ['Trigger', 'Event that starts a run — manual, envelope event, scheduled, or webhook'],
          ],
        },
      },
      {
        heading: 'Node Types',
        body: 'Each node in a workflow definition has a `type` field that controls what the engine does when it reaches that node.',
        table: {
          headers: ['type', 'Description', 'Key Config'],
          rows: [
            ['start', 'Entry point — required', '—'],
            ['end', 'Exit point — required', '—'],
            ['sendEmail', 'Send a templated email', 'to, subject, body'],
            ['approval', 'Pause and wait for approver', 'approverEmail, approverName'],
            ['delay', 'Wait N hours/days', 'delayHours, delayDays'],
            ['condition', 'Branch on true/false', 'conditionExpression'],
            ['documentTemplate', 'Generate a document', 'templateId, templateName'],
            ['signatureRequest', 'Send signing envelope', 'signerEmail, signerName, documentTitle'],
            ['webhook', 'POST to external URL', 'webhookUrl, method'],
            ['aiAction', 'Run AI analysis', 'prompt, model'],
          ],
        },
      },
      {
        heading: 'Workflow Status Values',
        body: 'Definitions and instances each have their own status lifecycle.',
        table: {
          headers: ['Entity', 'Status', 'Meaning'],
          rows: [
            ['Definition', 'Draft (0)', 'Being designed — not triggerable'],
            ['Definition', 'Published (1)', 'Live and triggerable'],
            ['Definition', 'Archived (2)', 'Retired — not triggerable'],
            ['Instance', 'Running (0)', 'Currently executing'],
            ['Instance', 'Paused (1)', 'Waiting for human action (approval)'],
            ['Instance', 'Completed (2)', 'All nodes executed successfully'],
            ['Instance', 'Failed (3)', 'A node failed — check errorMessage'],
            ['Instance', 'Cancelled (4)', 'Manually cancelled'],
          ],
        },
      },
      {
        heading: 'Quick Start — Create and Trigger a Workflow',
        body: 'Create a workflow definition with a simple two-node graph (start → end), publish it, then trigger it manually.',
        code: {
          label: 'curl',
          content: `# 1. Create a workflow (draft)
curl -X POST ${apiBaseUrl}/api/workflows \\
  -H "Authorization: Bearer eyJ..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "NDA Sign-Off",
    "description": "Automate NDA signing with AI review and reminders",
    "definition": {
      "nodes": [
        { "id": "start-1", "type": "start",     "position": {"x": 100, "y": 100}, "data": {"label": "Start"} },
        { "id": "email-1", "type": "sendEmail",  "position": {"x": 300, "y": 100}, "data": {"label": "Send NDA", "to": "{{signer.email}}", "subject": "Please sign the NDA" } },
        { "id": "sign-1",  "type": "signatureRequest", "position": {"x": 500, "y": 100}, "data": {"label": "Signature Request", "signerEmail": "{{signer.email}}" } },
        { "id": "end-1",   "type": "end",        "position": {"x": 700, "y": 100}, "data": {"label": "End"} }
      ],
      "edges": [
        { "id": "e1", "source": "start-1", "target": "email-1" },
        { "id": "e2", "source": "email-1", "target": "sign-1"  },
        { "id": "e3", "source": "sign-1",  "target": "end-1"   }
      ],
      "variables": [],
      "settings": {}
    }
  }'

# 2. Publish the workflow
curl -X POST ${apiBaseUrl}/api/workflows/{id}/publish \\
  -H "Authorization: Bearer eyJ..."

# 3. Trigger a run manually
curl -X POST ${apiBaseUrl}/api/workflows/{id}/trigger \\
  -H "Authorization: Bearer eyJ..." \\
  -H "Content-Type: application/json" \\
  -d '{"contextJson": "{\"signer\": {\"email\": \"john@example.com\", \"name\": \"John Doe\"}}"}'

# 4. Monitor the run
curl ${apiBaseUrl}/api/workflows/{id}/instances \\
  -H "Authorization: Bearer eyJ..."

# 5. Get a specific instance with node execution log
curl ${apiBaseUrl}/api/workflows/instances/{instanceId} \\
  -H "Authorization: Bearer eyJ..."

# 6. Cancel a running instance
curl -X POST ${apiBaseUrl}/api/workflows/instances/{instanceId}/cancel \\
  -H "Authorization: Bearer eyJ..."`,
        },
      },
      {
        heading: 'Clone from Template',
        body: 'Use one of the 5 built-in templates as a starting point. Clone it into your merchant account and customise freely.',
        code: {
          label: 'curl',
          content: `# List available templates (no auth required)
curl ${apiBaseUrl}/api/workflows/templates

# Clone the NDA template into your account
curl -X POST ${apiBaseUrl}/api/workflows/clone/{templateId} \\
  -H "Authorization: Bearer eyJ..."`,
        },
      },
    ],
    endpoints: [
      {
        id: 'wf-list', method: 'GET', path: '/api/workflows',
        title: 'List Workflows',
        description: 'Return all workflow definitions belonging to the authenticated merchant.',
        auth: 'bearer',
        response: JSON.stringify([{ id: 'uuid', name: 'NDA Sign-Off', status: 1, version: 1, isTemplate: false, category: 'Legal', instanceCount: 3, createdAt: '2026-05-01T00:00:00Z' }], null, 2),
      },
      {
        id: 'wf-create', method: 'POST', path: '/api/workflows',
        title: 'Create Workflow',
        description: 'Create a new workflow definition. Status defaults to Draft (0).',
        auth: 'bearer',
        body: JSON.stringify({ name: 'NDA Sign-Off', description: 'Automate NDA signing', definition: { nodes: [], edges: [], variables: [], settings: {} } }, null, 2),
        response: JSON.stringify({ id: 'uuid', name: 'NDA Sign-Off', status: 0, version: 1 }, null, 2),
      },
      {
        id: 'wf-templates', method: 'GET', path: '/api/workflows/templates',
        title: 'List Templates',
        description: 'Return all built-in workflow templates. No authentication required.',
        response: JSON.stringify([{ id: 'uuid', name: 'NDA Signing Process', isTemplate: true, category: 'Legal', templateName: 'NDA Signing' }], null, 2),
      },
      {
        id: 'wf-get', method: 'GET', path: '/api/workflows/{id}',
        title: 'Get Workflow',
        description: 'Return a workflow definition including its JSON graph and triggers.',
        auth: 'bearer',
        params: [{ name: 'id', type: 'string', required: true, description: 'Workflow definition UUID' }],
        response: JSON.stringify({ id: 'uuid', name: 'NDA Sign-Off', status: 1, version: 2, jsonDefinition: '{...}', triggers: [] }, null, 2),
      },
      {
        id: 'wf-update', method: 'PUT', path: '/api/workflows/{id}',
        title: 'Update Workflow',
        description: 'Save a new version of the workflow graph. Increments the version counter. Can only update Draft workflows.',
        auth: 'bearer',
        params: [{ name: 'id', type: 'string', required: true, description: 'Workflow definition UUID' }],
        body: JSON.stringify({ name: 'NDA Sign-Off v2', definition: { nodes: [], edges: [], variables: [], settings: {} } }, null, 2),
        response: JSON.stringify({ id: 'uuid', version: 2 }, null, 2),
      },
      {
        id: 'wf-publish', method: 'POST', path: '/api/workflows/{id}/publish',
        title: 'Publish Workflow',
        description: 'Transition a Draft workflow to Published status so it can be triggered.',
        auth: 'bearer',
        params: [{ name: 'id', type: 'string', required: true, description: 'Workflow definition UUID' }],
        response: JSON.stringify({ id: 'uuid', status: 1 }, null, 2),
      },
      {
        id: 'wf-delete', method: 'DELETE', path: '/api/workflows/{id}',
        title: 'Delete Workflow',
        description: 'Permanently delete a workflow definition and all its instances. Returns 204 No Content.',
        auth: 'bearer',
        params: [{ name: 'id', type: 'string', required: true, description: 'Workflow definition UUID' }],
        response: '204 No Content',
      },
      {
        id: 'wf-clone', method: 'POST', path: '/api/workflows/clone/{templateId}',
        title: 'Clone Template',
        description: 'Clone a built-in template into your merchant account as a Draft workflow.',
        auth: 'bearer',
        params: [{ name: 'templateId', type: 'string', required: true, description: 'Template definition UUID' }],
        response: JSON.stringify({ id: 'uuid', name: 'NDA Signing Process (copy)', status: 0, version: 1 }, null, 2),
      },
      {
        id: 'wf-trigger', method: 'POST', path: '/api/workflows/{id}/trigger',
        title: 'Trigger Workflow',
        description: 'Start a new workflow run (instance). The workflow must be Published. Returns the new WorkflowInstance.',
        auth: 'bearer',
        params: [{ name: 'id', type: 'string', required: true, description: 'Workflow definition UUID' }],
        body: JSON.stringify({ contextJson: '{"signer":{"email":"john@example.com","name":"John Doe"}}', envelopeId: null }, null, 2),
        response: JSON.stringify({ id: 'uuid', workflowDefinitionId: 'uuid', status: 0, currentNodeId: 'email-1', startedAt: '2026-05-06T10:00:00Z' }, null, 2),
      },
      {
        id: 'wf-instances', method: 'GET', path: '/api/workflows/{id}/instances',
        title: 'List Instances by Definition',
        description: 'Return all runs of a specific workflow definition.',
        auth: 'bearer',
        params: [{ name: 'id', type: 'string', required: true, description: 'Workflow definition UUID' }],
        response: JSON.stringify([{ id: 'uuid', status: 2, startedAt: '2026-05-06T10:00:00Z', completedAt: '2026-05-06T10:01:00Z', triggeredBy: 'Manual' }], null, 2),
      },
      {
        id: 'wf-instance-get', method: 'GET', path: '/api/workflows/instances/{instanceId}',
        title: 'Get Instance',
        description: 'Return a workflow instance including the full node execution log.',
        auth: 'bearer',
        params: [{ name: 'instanceId', type: 'string', required: true, description: 'WorkflowInstance UUID' }],
        response: JSON.stringify({ id: 'uuid', status: 2, nodeExecutions: [{ nodeId: 'email-1', nodeType: 'sendEmail', status: 2, startedAt: '2026-05-06T10:00:01Z', completedAt: '2026-05-06T10:00:02Z' }] }, null, 2),
      },
      {
        id: 'wf-instance-cancel', method: 'POST', path: '/api/workflows/instances/{instanceId}/cancel',
        title: 'Cancel Instance',
        description: 'Cancel a running or paused workflow instance. Returns 204 No Content.',
        auth: 'bearer',
        params: [{ name: 'instanceId', type: 'string', required: true, description: 'WorkflowInstance UUID' }],
        response: '204 No Content',
      },
      {
        id: 'wf-all-instances', method: 'GET', path: '/api/workflows/instances',
        title: 'List All Instances',
        description: 'Return all workflow runs across all definitions for the authenticated merchant (max 200).',
        auth: 'bearer',
        response: JSON.stringify([{ id: 'uuid', workflowDefinitionId: 'uuid', status: 2, startedAt: '2026-05-06T10:00:00Z' }], null, 2),
      },
      {
        id: 'wf-stats', method: 'GET', path: '/api/workflows/stats',
        title: 'Workflow Stats',
        description: 'Return aggregate statistics for the merchant: total definitions, published count, active/completed/failed instances.',
        auth: 'bearer',
        response: JSON.stringify({ totalDefinitions: 5, publishedDefinitions: 3, totalInstances: 42, runningInstances: 2, completedInstances: 38, failedInstances: 2 }, null, 2),
      },
    ],
  },
];

const METHOD_COLOR: Record<string, string> = {
  GET:    'bg-sky-100 text-sky-700',
  POST:   'bg-green-100 text-green-700',
  PUT:    'bg-amber-100 text-amber-700',
  DELETE: 'bg-red-100 text-red-700',
};

/* ── Copy button ── */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="ml-auto flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-400 hover:text-gray-200 transition"
    >
      {copied ? <CheckCircle className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

/* ── Wiki block card ── */
function WikiCard({ block }: { block: WikiBlock }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50 overflow-hidden mb-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-blue-100 transition-colors"
      >
        <span className="flex-1 text-sm font-semibold text-blue-800">{block.heading}</span>
        {open
          ? <svg className="h-4 w-4 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
          : <svg className="h-4 w-4 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>}
      </button>
      {open && (
        <div className="border-t border-blue-100 px-5 pb-4 pt-3 space-y-3">
          <p className="text-sm text-gray-700">{block.body}</p>
          {block.table && (
            <div className="overflow-x-auto rounded-lg border border-blue-200">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-blue-100">
                    {block.table.headers.map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-blue-700">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.table.rows.map((row, i) => (
                    <tr key={i} className="border-t border-blue-100 bg-white even:bg-blue-50">
                      {row.map((cell, j) => (
                        <td key={j} className={`px-3 py-2 text-xs ${j === 0 ? 'font-mono font-medium text-gray-800' : 'text-gray-600'}`}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {block.code && (
            <div className="rounded-xl bg-gray-900 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
                <span className="text-xs text-gray-400">{block.code.label}</span>
                <CopyButton text={block.code.content} />
              </div>
              <pre className="px-4 py-4 text-xs font-mono text-green-400 overflow-x-auto whitespace-pre">{block.code.content}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Endpoint card ── */
function EndpointCard({ ep }: { ep: Endpoint }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`rounded-xl border border-gray-200 overflow-hidden bg-white transition-all ${open ? 'shadow-md' : ''}`}>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <span className={`rounded-md px-2.5 py-1 text-xs font-bold font-mono ${METHOD_COLOR[ep.method]}`}>
          {ep.method}
        </span>
        <code className="text-sm font-mono text-gray-700 flex-1 break-all min-w-0">{ep.path}</code>
        <span className="text-sm text-gray-600 hidden md:block">{ep.title}</span>
        {ep.auth && (
          <Badge variant={ep.auth === 'bearer' ? 'default' : 'secondary'} className="hidden md:flex">
            {ep.auth === 'bearer' ? '🔐 JWT' : '🔑 API Key'}
          </Badge>
        )}
      </button>

      {open && (
        <div className="border-t border-gray-100 px-5 py-5 space-y-5">
          <p className="text-sm text-gray-600">{ep.description}</p>

          {ep.params && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Path Parameters</p>
              <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-500 text-left">
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Required</th>
                    <th className="px-3 py-2 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {ep.params.map((p) => (
                    <tr key={p.name} className="border-t border-gray-100">
                      <td className="px-3 py-2 font-mono text-xs text-gray-700">{p.name}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{p.type}</td>
                      <td className="px-3 py-2">
                        {p.required
                          ? <span className="text-xs text-red-500 font-medium">required</span>
                          : <span className="text-xs text-gray-400">optional</span>}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600">{p.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}

          {ep.headers && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Headers</p>
              <div className="rounded-xl bg-gray-900 px-4 py-3 text-xs font-mono text-green-400 flex flex-col gap-1">
                {Object.entries(ep.headers).map(([k, v]) => (
                  <div key={k}><span className="text-purple-400">{k}</span>: {v}</div>
                ))}
              </div>
            </div>
          )}

          {ep.body && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Request Body</p>
              <div className="rounded-xl bg-gray-900 overflow-hidden">
                <div className="flex items-center px-4 py-2 border-b border-gray-700">
                  <span className="text-xs text-gray-500">JSON</span>
                  <CopyButton text={ep.body} />
                </div>
                <pre className="px-4 py-4 text-xs font-mono text-green-400 overflow-x-auto whitespace-pre">{ep.body}</pre>
              </div>
            </div>
          )}

          {ep.response && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Response</p>
              <div className="rounded-xl bg-gray-900 overflow-hidden">
                <div className="flex items-center px-4 py-2 border-b border-gray-700">
                  <span className="text-xs text-gray-500">200 OK</span>
                  <CopyButton text={ep.response} />
                </div>
                <pre className="px-4 py-4 text-xs font-mono text-green-400 overflow-x-auto whitespace-pre">{ep.response}</pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Page ── */
export default function DocsPage() {
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id);
  const section = SECTIONS.find((s) => s.id === activeSection)!;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page header */}
      <div className="border-b border-gray-200 bg-white px-6 py-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-700 transition-colors mb-3"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">API Reference</h1>
              <p className="mt-2 text-gray-500 text-sm max-w-xl">
                Complete API reference for DocSignerHub. Base URL:{' '}
                <code className="font-mono text-brand-700">{apiBaseUrl}</code>
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="secondary">REST / JSON</Badge>
                <Badge variant="secondary">JWT Bearer</Badge>
                <Badge variant="secondary">API Key (X-Api-Key)</Badge>
                <Badge variant="secondary">Swagger UI</Badge>
              </div>
            </div>
            <a
              href={swaggerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-100 transition-colors"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              Open Swagger UI
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl flex flex-col md:flex-row gap-0 py-8 px-4">
        {/* Sidebar nav */}
        <nav className="hidden md:block w-48 shrink-0 mr-8">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-2">Sections</p>
          <ul className="space-y-1">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <Button
                  variant={activeSection === s.id ? 'default' : 'ghost'}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setActiveSection(s.id)}
                >
                  {s.title}
                </Button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Mobile section select */}
        <div className="md:hidden w-full mb-6 shrink-0">
          <select
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
            value={activeSection}
            onChange={(e) => setActiveSection(e.target.value)}
          >
            {SECTIONS.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-gray-900 mb-5">{section.title}</h2>
          {section.wiki && section.wiki.length > 0 && (
            <div className="mb-6">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Guide &amp; Reference</p>
              {section.wiki.map((block) => (
                <WikiCard key={block.heading} block={block} />
              ))}
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 mt-6">Endpoints</p>
            </div>
          )}
          <div className="space-y-3">
            {section.endpoints.map((ep) => (
              <EndpointCard key={ep.id} ep={ep} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
