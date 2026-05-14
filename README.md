# DocSignerHub — Document Signing Platform

A full-stack SaaS document signing platform with AI-powered marketing automation, workflow engine, e-signature, blockchain audit trails, and multi-merchant support.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend API | .NET 8 / ASP.NET Core Web API |
| ORM | Entity Framework Core 8 (SQL Server) |
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| AI | DeepSeek Chat API (`deepseek-chat`) |
| Auth | JWT Bearer tokens |
| Email | SMTP via MailKit |
| Background Jobs | `BackgroundService` workers (EF + in-process) |
| Payments | Stripe |
| Blockchain | Polygon RPC |

---

## Prerequisites

Before running locally, ensure the following are installed:

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js 18+](https://nodejs.org/) and npm
- [SQL Server](https://www.microsoft.com/en-us/sql-server/sql-server-downloads) (local instance or SQL Express)
- [Git](https://git-scm.com/)

---

## Project Structure

```
DocumentSigningPlatform/
├── src/
│   ├── DocumentSigning.Api/            # ASP.NET Core API (port 5163)
│   ├── DocumentSigning.Core/           # Domain entities, DTOs, interfaces
│   └── DocumentSigning.Infrastructure/ # EF Core, services, background jobs
├── tests/
│   └── DocumentSigning.Tests/          # Unit tests
├── web/                                # Next.js frontend (port 3000)
│   ├── src/
│   │   ├── app/                        # Next.js App Router pages
│   │   ├── components/                 # Shared UI components
│   │   ├── lib/api.ts                  # Typed API client
│   │   └── store/                      # Zustand state stores
└── doc/                                # Architecture docs, Postman collection
```

---

## 1. Clone the Repository

```bash
git clone https://github.com/rajibmahata/DocumentSigningPlatform.git
cd DocumentSigningPlatform
```

---

## 2. Configure the Backend

### 2a. Edit `appsettings.Development.json`

Open `src/DocumentSigning.Api/appsettings.Development.json` and fill in:

```json
{
  "ConnectionStrings": {
    "Default": "Server=YOUR_SQL_SERVER;Database=DocumentSigningDb;User Id=sa;Password=YOUR_PASSWORD;TrustServerCertificate=True;"
  },
  "App": {
    "BaseUrl": "http://localhost:5163",
    "FrontendUrl": "http://localhost:3000"
  },
  "Jwt": {
    "Key": "CHANGE-THIS-TO-A-STRONG-JWT-SECRET-KEY-AT-LEAST-32-CHARS",
    "Issuer": "DocumentSigningPlatform",
    "Audience": "DocumentSigningPlatformUsers",
    "ExpiryMinutes": "60"
  },
  "DeepSeek": {
    "ApiKey": "YOUR_DEEPSEEK_API_KEY",
    "Model": "deepseek-chat",
    "BaseUrl": "https://api.deepseek.com"
  },
  "Email": {
    "SmtpHost": "YOUR_SMTP_HOST",
    "SmtpPort": "587",
    "SmtpUser": "YOUR_EMAIL",
    "SmtpPass": "YOUR_EMAIL_PASSWORD",
    "FromAddress": "noreply@yourdomain.com",
    "FromName": "DocSignerHub"
  }
}
```

> **Optional:** Set `Stripe:SecretKey` and `Stripe:WebhookSecret` if testing payments.

### 2b. Run Database Migrations

```bash
cd DocumentSigningPlatform

dotnet ef database update \
  --project src/DocumentSigning.Infrastructure \
  --startup-project src/DocumentSigning.Api
```

On Windows PowerShell:
```powershell
dotnet ef database update `
  --project src/DocumentSigning.Infrastructure `
  --startup-project src/DocumentSigning.Api
```

This applies all migrations including:
- `InitialCreate` — core tables
- `AddMarketingEngine` — social accounts, posts, campaigns, engagements

---

## 3. Run the Backend API

```bash
# From the repository root
dotnet run --project src/DocumentSigning.Api --launch-profile http
```

The API starts at **http://localhost:5163**

- Swagger UI: **http://localhost:5163/swagger**
- Auto-applies pending migrations on startup
- Starts background workers: `DailyMarketingAgent`, `ReminderWorker`, `ExpiryWorker`, `OutboxWorker`, `WebhookDeliveryWorker`

---

## 4. Run the Frontend

```bash
cd web

# Install dependencies (first time only)
npm install

# Start development server
npm run dev
```

The frontend starts at **http://localhost:3000**

### Environment Variables (optional)

Create `web/.env.local` to override defaults:

```env
NEXT_PUBLIC_API_URL=http://localhost:5163
```

> If not set, the Next.js rewrite proxy (`/backend/*`) defaults to `http://localhost:5163`.

---

## 5. Running Both Together (split terminals)

**Terminal 1 — Backend:**
```bash
cd DocumentSigningPlatform
dotnet run --project src/DocumentSigning.Api --launch-profile http
```

**Terminal 2 — Frontend:**
```bash
cd DocumentSigningPlatform/web
npm run dev
```

---

## 6. Running Tests

```bash
cd DocumentSigningPlatform
dotnet test tests/DocumentSigning.Tests
```

---

## 7. Application URLs (Local)

| Service | URL |
|---|---|
| Frontend (Admin Panel) | http://localhost:3000 |
| Backend API | http://localhost:5163 |
| Swagger / API Docs | http://localhost:5163/swagger |

---

## 8. Key Features & Pages

### Admin Panel (Frontend)
| Path | Feature |
|---|---|
| `/dashboard` | Overview stats |
| `/dashboard/envelopes` | Document envelopes |
| `/dashboard/templates` | Document templates |
| `/dashboard/workflows` | Workflow builder (drag & drop) |
| `/dashboard/contacts` | Signer contacts & groups |
| `/dashboard/marketing` | Marketing Hub |
| `/dashboard/marketing/social` | Social account connections |
| `/dashboard/marketing/campaigns` | Campaign kanban board |
| `/dashboard/marketing/content` | AI Content Studio (DeepSeek) |
| `/dashboard/marketing/scheduled` | Scheduled post queue |
| `/dashboard/marketing/engagement` | Engagement inbox |
| `/dashboard/marketing/analytics` | Marketing analytics |
| `/dashboard/analytics` | Platform analytics |
| `/dashboard/settings` | Merchant settings |

### API Endpoints
| Prefix | Description |
|---|---|
| `POST /api/auth/login` | Authenticate, get JWT |
| `POST /api/auth/register` | Register new merchant |
| `GET/POST /api/envelopes` | Envelope management |
| `GET/POST /api/templates` | Document templates |
| `GET/POST /api/workflows` | Workflow engine |
| `GET/POST /api/marketing/*` | Marketing automation |
| `GET /api/analytics/*` | Analytics data |
| `GET /api/audit-logs` | Audit trail |

---

## 9. AI Marketing Agent

The `DailyMarketingAgent` background service runs at **08:00 UTC** each day and:

1. Scans all merchants with active social accounts
2. Picks a random content category (product features, compliance, tips, etc.)
3. Calls DeepSeek API to generate platform-optimised posts
4. Saves generated posts as `draft` status — ready for review and publishing

**DeepSeek API Key** is required for this feature. Get one at [platform.deepseek.com](https://platform.deepseek.com).

---

## 10. Database Migrations (Reference)

To add a new migration:
```bash
dotnet ef migrations add MigrationName \
  --project src/DocumentSigning.Infrastructure \
  --startup-project src/DocumentSigning.Api \
  --output-dir Migrations
```

To apply migrations:
```bash
dotnet ef database update \
  --project src/DocumentSigning.Infrastructure \
  --startup-project src/DocumentSigning.Api
```

---

## 11. Build for Production

**Backend:**
```bash
dotnet publish src/DocumentSigning.Api -c Release -o ./publish/api
```

**Frontend:**
```bash
cd web
npm run build
npm run start   # preview production build locally
```

---

## 12. Common Issues

| Problem | Solution |
|---|---|
| `Cannot connect to SQL Server` | Check the connection string in `appsettings.Development.json`. Ensure SQL Server is running and the user has the required permissions. |
| `Port 5163 already in use` | Kill the process: `netstat -ano \| findstr :5163` then `taskkill /PID <pid> /F` |
| `Port 3000 already in use` | Run on a different port: `npm run dev -- -p 3001` |
| `DeepSeek API errors` | Ensure `DeepSeek:ApiKey` is set and the account has credits. |
| `JWT errors on API calls` | Ensure `Jwt:Key` is at least 32 characters and matches between API and any external clients. |
| `EF migration errors` | Ensure the database exists and the user has `CREATE TABLE` permissions. Run `dotnet ef database update` again. |

---

## Production Deployment

See [doc/IMPLEMENTATION_PLAN.md](doc/IMPLEMENTATION_PLAN.md) for full deployment architecture.

- **Backend**: Deployed to `http://api.docsignerhub.com` (IIS / Azure App Service)
- **Frontend**: Deployed to `https://docsignerhub.com` (Vercel / standalone Next.js)
- **Database**: SQL Server on `SQL1003.site4now.net`

---

## Contributing

1. Create a branch from `develop`
2. Make changes
3. Run `dotnet test` and `npx tsc --noEmit` (in `web/`)
4. Open a pull request against `develop`
