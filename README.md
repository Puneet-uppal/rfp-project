# AI-Powered RFP Management System

A full-stack web application that streamlines the Request for Proposal (RFP) workflow using AI to parse natural language, analyze vendor responses, and provide intelligent recommendations.

![RFP Management System](https://img.shields.io/badge/status-development-yellow)
![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-green)
![TypeScript](https://img.shields.io/badge/typescript-5.3-blue)

## Features

### Core Functionality

1. **AI-Powered RFP Creation**
   - Describe procurement needs in natural language
   - AI automatically extracts structured data (items, quantities, specifications, budget, timeline)
   - Generates professional RFP summaries
   - Supports multiple currencies (USD, EUR, INR, GBP, etc.)

2. **Vendor Management**
   - CRUD operations for vendor contacts
   - Categorize vendors by type
   - Track vendor response history
   - Soft delete support (data preservation)

3. **Email Integration**
   - Send RFPs to multiple vendors via SMTP
   - Receive vendor responses via IMAP polling (auto-starts with server)
   - Auto-link responses to correct RFPs

4. **Intelligent Response Parsing**
   - AI extracts pricing, delivery terms, and specifications from vendor emails
   - Supports PDF and text attachment parsing
   - Handles messy, unstructured vendor responses

5. **Proposal Comparison & Recommendations**
   - Side-by-side proposal comparison
   - AI-generated scores across multiple criteria
   - Automated vendor recommendation with reasoning
   - Visual charts for price and score comparison

6. **Error Handling & Reliability**
   - Global exception filter for graceful error handling
   - Retry logic with exponential backoff for third-party APIs
   - Connection timeouts and graceful shutdown handling
   - User-friendly error messages

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Framer Motion |
| Backend | NestJS 10, TypeScript, Sequelize ORM |
| Database | PostgreSQL |
| AI Provider | Google Gemini (FREE) - gemini-2.0-flash |
| Email | Nodemailer (SMTP), IMAP for receiving |
| State Management | Zustand |
| Charts | Recharts |
| API Documentation | Swagger/OpenAPI |

## Prerequisites

- Node.js >= 18.0.0
- PostgreSQL >= 14
- Google Gemini API Key (FREE - get at https://makersuite.google.com/app/apikey)
- Email Account (Gmail recommended for testing)

## Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd rfp-management-system
```

### 2. Database Setup

Create a PostgreSQL database:

```sql
CREATE DATABASE rfp_management;
```

### 3. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment file
cp env.example .env

# Edit .env with your configuration (see Environment Variables below)

# Start development server (auto-syncs database)
npm run start:dev
```

### 4. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### 5. Seed Sample Data (Optional)

```bash
cd backend
npm run seed
```

This creates sample vendors for testing.

## Environment Variables

All environment variables are centralized in `backend/src/config/constants.ts` for type safety and consistency.

### Backend (backend/.env)

```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=your_password
DATABASE_NAME=rfp_management

# Server
PORT=3001
NODE_ENV=development

# Google Gemini AI (FREE)
# Get your key at: https://makersuite.google.com/app/apikey
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.0-flash

# Email - SMTP (Sending)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=your-email@gmail.com
EMAIL_FROM_NAME=RFP Management System

# Email - IMAP (Receiving)
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
IMAP_USER=your-email@gmail.com
IMAP_PASSWORD=your-app-password
IMAP_TLS=true

# Frontend URL (CORS)
FRONTEND_URL=http://localhost:3000
```

### Configuration Constants

The application uses a centralized constants file (`backend/src/config/constants.ts`) that provides:

| Constant Group | Description |
|----------------|-------------|
| `SERVER` | Port, environment, frontend URL |
| `DATABASE` | Host, port, credentials, database name |
| `AI` | Gemini API key and model |
| `SMTP` | Email sending configuration |
| `IMAP` | Email receiving configuration |
| `EMAIL_FROM` | Sender email and name |
| `DEFAULTS` | Timeouts, retry limits, intervals |

### Getting a FREE Gemini API Key

1. Go to https://makersuite.google.com/app/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key and add it to your `.env` file

**Free Tier Limits:**
- 60 requests per minute
- 1 million tokens per minute
- No credit card required

### Email Configuration Notes

**For Gmail:**
1. Enable 2-Factor Authentication
2. Generate an App Password: Google Account > Security > 2-Step Verification > App passwords
3. Use the App Password (16 characters) as `SMTP_PASSWORD` and `IMAP_PASSWORD`

## API Documentation

Once the backend is running, access the Swagger documentation at:

```
http://localhost:3001/api/docs
```

### Main Endpoints

#### RFPs

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/rfps/parse` | Create RFP from natural language |
| POST | `/api/rfps` | Create RFP from structured data |
| GET | `/api/rfps` | List all RFPs |
| GET | `/api/rfps/:id` | Get RFP details |
| PATCH | `/api/rfps/:id` | Update RFP |
| DELETE | `/api/rfps/:id` | Delete RFP |
| POST | `/api/rfps/:id/send` | Send RFP to vendors |

#### Vendors

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/vendors` | List all vendors (excludes soft-deleted) |
| POST | `/api/vendors` | Create vendor |
| GET | `/api/vendors/:id` | Get vendor details |
| PATCH | `/api/vendors/:id` | Update vendor |
| DELETE | `/api/vendors/:id` | Soft delete vendor (sets isDeleted=true) |

#### Proposals

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/proposals/rfp/:rfpId` | Get proposals for RFP |
| POST | `/api/proposals/manual` | Create manual proposal |
| POST | `/api/proposals/:id/reparse` | Re-parse proposal with AI |
| POST | `/api/proposals/:id/select` | Select as deal winner |

#### Comparison

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/comparison/:rfpId` | Compare proposals |
| POST | `/api/comparison/:rfpId/recommend` | Get AI recommendation |
| POST | `/api/comparison/:rfpId/full` | Full comparison with AI |

### Example Requests

#### Create RFP from Natural Language

```bash
curl -X POST http://localhost:3001/api/rfps/parse \
  -H "Content-Type: application/json" \
  -d '{
    "input": "I need to procure laptops and monitors for our new office. Budget is 50000 USD total. Need delivery within 30 days. We need 20 laptops with 16GB RAM and 15 monitors 27-inch. Payment terms should be net 30, and we need at least 1 year warranty."
  }'
```

#### Send RFP to Vendors

```bash
curl -X POST http://localhost:3001/api/rfps/{rfpId}/send \
  -H "Content-Type: application/json" \
  -d '{
    "vendorIds": ["vendor-uuid-1", "vendor-uuid-2"]
  }'
```

## Design Decisions

### 1. RFP Data Model

The RFP is structured with:
- Core metadata (title, description, budget, currency, deadlines)
- Line items with specifications (stored as JSONB for flexibility)
- Many-to-many relationship with vendors via junction table
- Status tracking through the lifecycle (Draft, Published, Sent, Evaluating, Deal Sold, Closed)

### 2. AI Integration Strategy

Using Google Gemini (free tier) for:
- **RFP Creation**: Single prompt with JSON response format for consistent parsing
- **Proposal Parsing**: Context-aware prompt including original RFP requirements
- **Scoring**: Multi-criteria evaluation with weighted scoring
- **Recommendations**: Comparative analysis with detailed reasoning

**Error Handling:**
- Exponential backoff retry (1s, 30s, 60s, 90s) for rate limit errors
- Graceful handling of network failures and API outages
- User-friendly error messages

### 3. Centralized Configuration

All environment variables are accessed through a constants file:
- Single source of truth for configuration
- Type-safe access (strings parsed to numbers/booleans)
- Default values in one place
- IDE autocomplete support
- Easy to mock in tests

### 4. Soft Delete Pattern

Vendors use soft delete for data integrity:
- `isDeleted` boolean field (default: false)
- DELETE endpoint sets `isDeleted=true` instead of removing record
- All GET endpoints filter out soft-deleted records
- Preserves historical data and relationships

### 5. Why Sequelize ORM?

- More familiar API for developers coming from other frameworks
- Excellent TypeScript support with decorators
- Active community and good documentation
- Easy model associations and migrations

### 6. Why Google Gemini?

- 100% FREE - No credit card required
- 60 requests/minute free tier (sufficient for this use case)
- Comparable quality to GPT-4 for structured tasks
- Fast response times with gemini-2.0-flash

### 7. Email Architecture

Two approaches supported:
- **IMAP Polling**: Periodically check inbox for new responses (auto-starts with server, 60s interval)
- **Webhook**: Real-time processing via services like SendGrid Inbound Parse

### 8. Frontend Architecture

- **Zustand** for lightweight state management
- **Framer Motion** for smooth animations
- **Dark theme** with gradient accents for modern look
- **Custom modals** for confirmations (no browser dialogs)

## Assumptions & Limitations

### Assumptions

1. Single-user system (no authentication required)
2. Vendors respond via email with recognizable content
3. Email sender address matches vendor record
4. Most recent sent RFP is linked to incoming responses
5. Currency is specified by user during RFP creation

### Limitations

1. PDF parsing is basic (text extraction only, no table recognition)
2. No OCR for scanned documents
3. Email threading relies on sender matching
4. No support for multi-page RFPs or complex approval workflows

## AI Tools Usage

### Tools Used During Development

- **Claude (Anthropic)**: Architecture design, code generation, debugging
- **Cursor**: AI-powered code editing and suggestions

### What AI Helped With

1. **Boilerplate Generation**: NestJS modules, DTOs, services
2. **Prompt Engineering**: Crafting effective prompts for RFP parsing
3. **UI Components**: Tailwind CSS styling and animations
4. **TypeScript Types**: Complex type definitions

## Project Structure

```
backend/
  src/
    common/               # Filters, guards, utilities
      filters/            # Exception filters
    config/               # Configuration
      constants.ts        # Centralized env variables
      database.config.ts  # Database configuration
      email.config.ts     # Email configuration
      ai.config.ts        # AI configuration
      index.ts            # Config exports
    database/
      models/             # Sequelize models
      seeds/              # Seed data
    modules/
      ai/                 # Google Gemini integration
      comparison/         # Proposal comparison
      email/              # Email send/receive
      proposal/           # Vendor proposals
      rfp/                # RFP management
      vendor/             # Vendor management
  package.json
  tsconfig.json

frontend/
  src/
    components/           # Reusable components
    hooks/                # Custom hooks & store
    pages/                # Page components
    services/             # API client
    types/                # TypeScript types
  package.json
  vite.config.ts

.gitignore
README.md
```

## Running in Production

### Backend

```bash
cd backend
npm run build
npm run start:prod
```

### Frontend

```bash
cd frontend
npm run build
# Serve the dist/ folder with your preferred web server
```

## Testing the Full Workflow

1. **Create Vendors**: Add 2-3 test vendors in the Vendors page
2. **Create RFP**: Use natural language to describe procurement needs (include currency)
3. **Review & Send**: Review the parsed RFP and send to vendors
4. **Simulate Response**: 
   - Send an email to your configured email address
   - OR create a manual proposal via the API
5. **Fetch Emails**: IMAP polling automatically fetches responses every 60 seconds
6. **Compare**: View the comparison page and get AI recommendation
7. **Award**: Select a winning vendor (Deal Sold)

## Future Improvements

- Multi-tenant support with authentication
- RFP templates and versioning
- Advanced PDF parsing with table extraction
- Real-time notifications via WebSocket
- Export to PDF/Word formats
- Vendor portal for direct response submission

## License

MIT

---

Built with NestJS, React, and Google Gemini AI
