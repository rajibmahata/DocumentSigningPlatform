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
