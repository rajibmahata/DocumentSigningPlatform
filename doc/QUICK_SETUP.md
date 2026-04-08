# Document Signing Platform — Quick Setup Guide

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| .NET SDK | 8.0+ | `dotnet --version` to verify |
| SQL Server | 2019+ | Local or remote; Express edition works |
| SMTP server | Any | Can use MailHog/Mailtrap for local dev |
| Visual Studio / Rider / VS Code | Any recent | VS Code with C# Dev Kit recommended |

---

## 1. Clone / Open the Solution

```powershell
# Open solution in VS Code
code "e:\rajibmahata\DocumentSigningPlatform"

# Or open the solution file directly in Visual Studio
start DocumentSigningPlatform.slnx
```

---

## 2. Configure appsettings.json

Edit `src\DocumentSigning.Api\appsettings.json`:

```json
{
  "ConnectionStrings": {
    "Default": "Server=YOUR_SERVER;Database=DocumentSigningDb;User Id=sa;Password=YOUR_PASSWORD;TrustServerCertificate=True;"
  },
  "Token": {
    "Secret": "REPLACE-WITH-A-RANDOM-STRING-32-CHARS-MINIMUM"
  },
  "App": {
    "BaseUrl": "https://localhost:5001"
  },
  "Email": {
    "FromAddress": "noreply@yourcompany.com",
    "FromName": "Document Signing Platform",
    "SmtpHost": "smtp.yourhost.com",
    "SmtpPort": "587",
    "SmtpUser": "your-smtp-user",
    "SmtpPass": "your-smtp-password",
    "UseSsl": "true",
    "AdminAddress": "admin@yourcompany.com",
    "FirmAddress": "firm@yourcompany.com"
  },
  "Swagger": {
    "Enabled": true
  }
}
```

> **Security**: For production, move `ConnectionStrings` and `Token:Secret` to environment variables or Azure Key Vault. Never commit real credentials to source control.

---

## 3. Restore NuGet Packages

```powershell
cd "e:\rajibmahata\DocumentSigningPlatform"
dotnet restore
```

---

## 4. Apply Database Migrations

The application will auto-migrate on startup, but you can also run manually:

```powershell
cd "e:\rajibmahata\DocumentSigningPlatform"
dotnet ef database update --project src\DocumentSigning.Infrastructure --startup-project src\DocumentSigning.Api
```

This creates the following tables in `DocumentSigningDb`:
- `Claims`
- `Documents`
- `SigningRequests`
- `SignedDocuments`
- `OutboxQueue`
- `AuditLogs`

---

## 5. Build the Solution

```powershell
dotnet build
```

Expected output: `Build succeeded. 0 Error(s)`

---

## 6. Run the Application

```powershell
cd "e:\rajibmahata\DocumentSigningPlatform\src\DocumentSigning.Api"
dotnet run
```

The app starts on:
- **HTTP**: `http://localhost:5000`
- **HTTPS**: `https://localhost:5001`

---

## 7. Access Swagger UI

Open your browser at:

```
https://localhost:5001/swagger
```

You should see the Document Signing API with 4 endpoints documented.

---

## 8. Run Unit Tests

```powershell
cd "e:\rajibmahata\DocumentSigningPlatform"
dotnet test tests\DocumentSigning.Tests
```

Expected: `Passed! — Failed: 0, Passed: 31, Skipped: 0`

---

## 9. Local Dev Email (Optional)

For local development, use [MailHog](https://github.com/mailhog/MailHog) to capture outgoing emails:

```powershell
# Install via Go or download binary, then run:
mailhog
# Web UI at http://localhost:8025
# SMTP at localhost:1025
```

Update `appsettings.json`:
```json
"SmtpHost": "localhost",
"SmtpPort": "1025",
"UseSsl": "false"
```

---

## Project Structure

```
DocumentSigningPlatform/
├── doc/                          ← This documentation folder
├── src/
│   ├── DocumentSigning.Core/     ← Domain layer (entities, interfaces, DTOs, enums)
│   ├── DocumentSigning.Infrastructure/ ← Data + services (EF Core, repos, jobs)
│   └── DocumentSigning.Api/      ← ASP.NET Core Web API + Blazor Server portal
└── tests/
    └── DocumentSigning.Tests/    ← xUnit unit tests (31 tests)
```

---

## Environment Variables (Production)

For production deployments, set these instead of editing appsettings:

```bash
CONNECTIONSTRINGS__DEFAULT="Server=prod-sql;Database=DocumentSigningDb;..."
TOKEN__SECRET="your-production-secret-32-chars-min"
EMAIL__SMTPPASS="your-smtp-password"
EMAIL__FIRMADDRESS="notifications@yourfirm.com"
```
