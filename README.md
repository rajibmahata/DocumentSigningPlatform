# DocSignerHub — Document Signing Platform

DocSignerHub is a full-stack document signing platform for businesses that need to send documents, collect signatures, track status, automate follow-up work, and keep an auditable history of every action.

It combines:

- a .NET 8 backend API
- a Next.js 14 frontend
- SQL Server persistence through Entity Framework Core
- background workers for reminders, expiry handling, outbox delivery, webhooks, and AI-assisted marketing tasks

The goal of this repository is to provide one place for the full product experience: public marketing pages, the authenticated dashboard, the signing flow, and the backend services that support them.

---

## What the platform does

At a high level, the product supports four major use cases:

1. **Document signing**
   - Create templates and envelopes
   - Send documents to signers
   - Capture signatures through a signer portal
   - Store signed documents and audit history

2. **Business workflow automation**
   - Build multi-step workflows
   - Trigger approvals, delays, notifications, and document actions
   - Manage recurring operational processes around document handling

3. **Merchant and admin management**
   - Manage users, merchants, branding, billing-related features, notifications, tickets, and audit logs
   - Support both merchant-level and admin-level views

4. **Growth and engagement tooling**
   - Marketing dashboards and campaign management
   - AI-assisted content generation through DeepSeek
   - Blog, analytics, social, scheduled publishing, and agent-manager capabilities

---

## Why this repository matters

If you are new to the project, think of it as a platform with three connected surfaces:

- **Public website** for product information, pricing, docs, and onboarding
- **Authenticated dashboard** for teams using the product day to day
- **Backend API and workers** that power signing, automation, notifications, and integrations

That means contributions can range from UI improvements and API changes to workflow logic, data model updates, documentation, and infrastructure-related application code.

---

## How the system fits together

### Backend

The backend is an ASP.NET Core Web API application that:

- exposes REST endpoints for auth, users, merchants, templates, envelopes, workflows, analytics, audit logs, webhooks, and more
- uses Entity Framework Core with SQL Server
- runs background workers for outbox processing, reminder handling, expiry processing, webhook delivery, and scheduled marketing jobs
- secures most endpoints with JWT ******

### Frontend

The frontend is a Next.js application that provides:

- public marketing and documentation pages
- login, registration, and password-reset flows
- dashboards for envelopes, templates, workflows, contacts, documents, settings, tickets, analytics, and marketing
- a signer experience for completing documents from a tokenized link

### Shared business flow

A typical document-signing flow is:

1. A user authenticates and creates or selects a merchant workspace
2. A template or document envelope is prepared
3. The backend stores the document and creates a signing request
4. Background workers send notifications and process queued jobs
5. The signer opens a secure signing link
6. The signed result, status changes, and audit history are stored

For a detailed walkthrough, see [`doc/HOW_IT_WORKS.md`](doc/HOW_IT_WORKS.md).

---

## Repository structure

```text
DocumentSigningPlatform/
├── src/
│   ├── DocumentSigning.Api/            # ASP.NET Core API entry point and controllers
│   ├── DocumentSigning.Core/           # Domain entities, DTOs, interfaces, enums
│   └── DocumentSigning.Infrastructure/ # EF Core, repositories, services, workers
├── tests/
│   └── DocumentSigning.Tests/          # Automated backend tests
├── web/                                # Next.js frontend application
└── doc/                                # Supporting documentation and diagrams
```

---

## Main technology choices

| Area | Technology |
|---|---|
| Backend | .NET 8 / ASP.NET Core Web API |
| Data access | Entity Framework Core 8 |
| Database | SQL Server |
| Frontend | Next.js 14, TypeScript, React |
| Styling | Tailwind CSS |
| Auth | JWT ******
| Email | MailKit / SMTP |
| Payments | Stripe |
| AI integration | DeepSeek |
| Background processing | Hosted `BackgroundService` workers |

---

## Key API areas

The API currently includes controllers for:

- authentication and password recovery
- users and merchants
- templates and envelopes
- signer contacts and notifications
- workflows and analytics
- audit logs and admin audit logs
- billing, payments, and subscriptions
- webhooks and blockchain-related envelope verification
- marketing, blog, tickets, and agent-manager features

The backend Swagger description is configured in `src/DocumentSigning.Api/Program.cs`.

---

## Local development setup

## Prerequisites

Install the following first:

- .NET 8 SDK
- Node.js 18+ and npm
- SQL Server

## Backend configuration

Update `src/DocumentSigning.Api/appsettings.Development.json` with values for:

- `ConnectionStrings:Default`
- `App:BaseUrl`
- `App:FrontendUrl`
- `Jwt:*`
- `Email:*`
- optional integrations such as `DeepSeek:*` and Stripe settings

## Frontend configuration

Create `web/.env.local` if you need to override the API URL:

```env
NEXT_PUBLIC_API_URL=http://localhost:5163
```

## Database migration

From the repository root:

```bash
dotnet ef database update \
  --project src/DocumentSigning.Infrastructure \
  --startup-project src/DocumentSigning.Api
```

## Run the backend

```bash
dotnet run --project src/DocumentSigning.Api --launch-profile http
```

Backend URL: `http://localhost:5163`  
Swagger URL: `http://localhost:5163/swagger`

## Run the frontend

```bash
cd web
npm install
npm run dev
```

Frontend URL: `http://localhost:3000`

---

## Validation commands

These are the most useful checks before opening a PR:

```bash
dotnet build
dotnet test tests/DocumentSigning.Tests
cd web && npm run build
```

Note: `npm run lint` currently triggers Next.js first-time ESLint setup because no ESLint configuration file is committed yet.

---

## How to contribute

If you want to contribute effectively:

1. Start by reading this README and the docs in [`doc/`](doc/)
2. Identify the area you want to change: API, infrastructure, tests, frontend, or documentation
3. Make focused changes rather than broad refactors
4. Update documentation when behavior or setup changes
5. Run the relevant validation commands before submitting work
6. Open your pull request against `develop`

### Good first areas for contributors

- improve onboarding and setup documentation
- add or refine dashboard screens
- strengthen tests around existing services and controllers
- improve workflow, notification, or envelope behavior
- polish API documentation and examples

### When changing backend behavior

- inspect the related controller, service, repository, and test coverage together
- check whether a background worker, audit log entry, or webhook flow is also affected

### When changing frontend behavior

- inspect the route under `web/src/app/`
- trace the API calls through shared frontend utilities and the corresponding backend endpoint
- confirm production build success with `npm run build`

---

## Additional project docs

- [`doc/HOW_IT_WORKS.md`](doc/HOW_IT_WORKS.md) — detailed signing lifecycle
- [`doc/QUICK_SETUP.md`](doc/QUICK_SETUP.md) — supplementary setup guide
- [`doc/IMPLEMENTATION_PLAN.md`](doc/IMPLEMENTATION_PLAN.md) — broader implementation and deployment planning

---

## Current branch expectations

The repository's documented contribution flow is:

1. create a branch from `develop`
2. make focused changes
3. validate your changes
4. open a pull request against `develop`

If you are unsure where to start, improving documentation, tests, and narrow feature slices is the best way to begin contributing safely.
