# Pulse — AI Personal Finance

Pulse is a mobile-first personal finance app that uses AI to score your spending decisions in real-time, generate personalized rescue plans when budgets slip, narrate your financial life in plain English, and simulate what-if scenarios against your actual transaction history.

Built as a hackathon submission.

---

## What it does

| Feature | Description |
|---|---|
| **Regret Score™** | Every transaction gets scored 0–100 based on your spending patterns and goals |
| **Rescue Plans** | When you overspend, AI generates a step-by-step recovery plan from your actual data |
| **Money Stories** | Monthly AI-narrated summaries of your financial journey — reads like a chapter, not a ledger |
| **Digital Twin Lab** | Run what-if simulations ("what if I saved $200 more/month?") against your real financial model |
| **Behavioral Guardrails** | Adaptive spending limits that learn your habits and alert you before you cross the line |
| **Streaks & Growth** | Gamified financial health tracking with achievements and milestones |

---

## Repo structure

```
/
├── artifacts/
│   ├── api-server/        # Express 5 REST API (TypeScript)
│   ├── finance-mobile/    # Expo / React Native mobile app
│   └── pulse-landing/     # Marketing landing page (React + Vite)
├── libs/
│   ├── db/                # PostgreSQL schema + Drizzle ORM
│   └── api-client-react/  # Auto-generated React Query hooks
└── package.json           # pnpm workspace root
```

---

## Tech stack

- **Mobile**: Expo SDK 54, React Native, Expo Router (file-based navigation)
- **API**: Node.js 24, Express 5, TypeScript
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: Clerk v3
- **AI**: OpenAI-compatible chat completions API (model: `gpt-4o-mini`)
- **Landing page**: React, Vite, Tailwind CSS v4, Framer Motion
- **Package manager**: pnpm workspaces

---

## Prerequisites

- Node.js 20+
- pnpm 9+ (`npm install -g pnpm`)
- PostgreSQL 14+ (local or hosted — [Neon](https://neon.tech) works great)
- Clerk account → [clerk.com](https://clerk.com) (free tier)
- AI API key (OpenAI-compatible, `sk-...` format)

---

## Environment variables

Create a `.env` file in the project root (or set these in your environment):

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/pulse

# Clerk authentication
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# AI model
AI_API_KEY=sk-...

# API server
PORT=8080

# Mobile app — set to where your API server is publicly reachable
EXPO_PUBLIC_DOMAIN=https://your-api-domain.com
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
```

> `EXPO_PUBLIC_*` variables are baked into the Expo bundle at build time.  
> For local development you can point `EXPO_PUBLIC_DOMAIN` at a tunnel like [ngrok](https://ngrok.com) or [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/).

---

## Setup

```bash
# 1. Clone the repo
git clone https://github.com/lStarryskyl/Amad-Hackathon-Wazen.git
cd Amad-Hackathon-Wazen

# 2. Install dependencies
pnpm install

# 3. Push the database schema
pnpm --filter @workspace/db run push

# 4. Build shared libraries (required before first run)
pnpm run typecheck:libs
```

---

## Running everything

You need three terminals running in parallel.

### Terminal 1 — API server

```bash
pnpm --filter @workspace/api-server run dev
```

Starts the REST API on the port defined by `PORT` (default `8080`).  
New users are automatically provisioned with 6 months of realistic demo transaction data on first sign-in.

### Terminal 2 — Landing page

```bash
pnpm --filter @workspace/pulse-landing run dev
```

Starts the marketing site on `http://localhost:3000` (or next available port).

### Terminal 3 — Mobile app

```bash
pnpm --filter @workspace/finance-mobile run dev
```

Opens Expo Dev Tools. Scan the QR code with the **Expo Go** app on your phone, or press:
- `w` — open in web browser
- `a` — open in Android emulator
- `i` — open in iOS simulator

> **Note**: Push notifications require a physical device with an EAS build. They gracefully degrade in Expo Go.

---

## Building the mobile app (APK / IPA)

We use [EAS Build](https://docs.expo.dev/build/introduction/) for native builds.

```bash
# Install EAS CLI
npm install -g eas-cli

cd artifacts/finance-mobile

# Log in to your Expo account
eas login

# Configure the project (first time only)
eas init

# Build Android APK (preview profile)
eas build --profile preview --platform android

# Build iOS (requires Apple Developer account)
eas build --profile preview --platform ios
```

The `preview` build profile in `eas.json` bakes in `EXPO_PUBLIC_DOMAIN` and `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` at build time.

---

## AI features

All AI features work with or without an API key:

- **With key** (`AI_API_KEY` set): full AI-generated narratives, personalized rescue plans, and contextual check-in messages
- **Without key**: every AI feature falls back to deterministic, rules-based output generated from your actual transaction data — the app remains fully functional

Users can also supply their own API key through the app's Profile screen, which is encrypted before storage.

---

## Database schema management

```bash
# Apply schema changes to your database
pnpm --filter @workspace/db run push

# Regenerate API client hooks after changing the OpenAPI spec
pnpm --filter @workspace/api-spec run codegen
```

---

## Project commands

| Command | What it does |
|---|---|
| `pnpm install` | Install all workspace dependencies |
| `pnpm run typecheck` | Full TypeScript check across all packages |
| `pnpm run build` | Typecheck + build all packages |
| `pnpm --filter @workspace/api-server run dev` | Start API server (dev mode with hot-reload) |
| `pnpm --filter @workspace/pulse-landing run dev` | Start landing page dev server |
| `pnpm --filter @workspace/finance-mobile run dev` | Start Expo dev server |
| `pnpm --filter @workspace/db run push` | Push DB schema changes |

---

## Team

Built by **Amad** for hackathon submission.
