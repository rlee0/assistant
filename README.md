# Assistant chatbot

Next.js App Router AI workspace with Supabase auth, streaming ai-sdk chat, configurable models, and a tool registry ready for expansion.

## Highlights

- Supabase email/password + OAuth (SSR-aware clients for routing and server actions).
- Chat workspace with pinned sessions, streaming markdown, editable/resend messages, checkpoints, suggestions, and model picker backed by the AI gateway.
- Settings page with VS Code–style navigation, zod-driven forms, and a JSON editor for advanced edits; tool registry plumbing in place for per-user tool settings.
- Data stored in Supabase (`chats`, `messages`, `checkpoints`, `settings`, `tools`) with real-time sync via the useChat hook from AI SDK UI.
- UI built from ai-elements, Radix primitives, Tailwind CSS 4, Motion, and lucide icons.

## Tech stack

- Next.js 16 (React 19, App Router), TypeScript
- Supabase auth/DB via `@supabase/ssr`
- ai-sdk + ai-elements for streaming and rich responses (shiki + remark-gfm for markdown)
- State: AI SDK UI (useChat hook), Settings: Zustand; Forms/validation: React Hook Form + Zod
- Styling: Tailwind CSS 4, Radix UI, Motion/Embla/Recharts utilities

## Prerequisites

- Node.js 20+ (Next.js 16 requires >=18; 20 is recommended)
- pnpm 9+ (lockfile is pnpm-based)
- Supabase project with email/OAuth enabled
- OpenAI-compatible model provider (OpenAI, Azure OpenAI, or an AI gateway URL)

## Environment

Create `.env.local` with the variables you need:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Optional/conditional
SUPABASE_SERVICE_ROLE_KEY=   # needed for POST /api/account/delete
AI_GATEWAY_URL=              # e.g. https://api.openai.com/v1 or your gateway base
AI_GATEWAY_API_KEY=          # preferred; falls back to OPENAI_API_KEY or AZURE_OPENAI_API_KEY
OPENAI_API_KEY=
AZURE_OPENAI_API_KEY=
AI_MODEL=gpt-4o-mini         # default model override
AI_GATEWAY_MODEL=            # alternative default when using a gateway
```

Notes:

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are required for auth; the app surfaces a friendly error if they are missing.
- `AI_GATEWAY_URL` + `AI_GATEWAY_API_KEY` drive `/api/models` and `/api/chat`; if omitted, bundled ai-sdk defaults are used for model lists.
- `SUPABASE_SERVICE_ROLE_KEY` is only used to delete the current account.

## Supabase data model (minimum)

- `chats`: id (uuid/text PK), user_id (uuid), title (text), is_pinned (bool), updated_at (timestamptz)
- `messages`: id (uuid/text PK), chat_id (FK to chats), role (text), content (text/jsonb), created_at (timestamptz)
- `checkpoints`: id (serial/uuid), chat_id (FK to chats), payload (jsonb[]), created_at (timestamptz)
- `settings`: id (uuid PK = user id), data (jsonb)
- `tools`: id (text), settings (jsonb), user_id (uuid, nullable for global defaults)

## Running locally

1. Install dependencies: `pnpm install`
2. Configure `.env.local` (see above)
3. Start dev server: `pnpm dev` (http://localhost:3000)
4. Production build: `pnpm build` then `pnpm start`
5. Lint: `pnpm lint`

## API routes

- `POST /api/chat` — streams model responses; requires `messages` array; uses `AI_GATEWAY_API_KEY` or `OPENAI_API_KEY`/`AZURE_OPENAI_API_KEY` fallback; optionally prepends `context` as a system message; applies per-user tool settings if present.
- `GET /api/models` and `GET /api/models/list` — fetch models from `AI_GATEWAY_URL` + `AI_GATEWAY_API_KEY`, falling back to ai-sdk gateway defaults when unavailable.
- `POST /api/account/delete` — deletes the authenticated user via Supabase service role key.

## Project layout

- `src/app` — App Router routes, layouts, API handlers, auth pages, settings UI
- `src/components` — chat UI, ai-elements wrappers, shared UI primitives
- `src/lib` — constants, utilities, validation, Supabase clients/loaders/persistence, settings helpers
- `src/store` — Zustand store for settings only
- `src/types` — shared type definitions (chat types, etc.)

## Development notes

- Supabase clients are SSR-aware; use `createSupabaseServerClient` in server contexts and `createSupabaseBrowserClient` in client components.
- Model picker populates from `/api/models`; provide a gateway for live lists or it will fall back to default entries.
- Tool registry ships empty by default; add entries in `src/tools/index.ts` and persist per-user settings in the `tools` table.
