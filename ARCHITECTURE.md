# Application Architecture

This document describes the directory structure and architectural decisions for this Next.js application.

## Directory Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth route group
│   │   ├── login/
│   │   └── signup/
│   ├── (chat)/                   # Chat route group
│   │   ├── page.tsx              # Chat home
│   │   └── chat/[id]/            # Chat detail
│   ├── settings/
│   ├── api/                      # API route handlers
│   │   ├── auth/
│   │   ├── account/
│   │   ├── chat/
│   │   ├── models/
│   │   └── settings/
│   ├── layout.tsx
│   └── page.tsx
│
├── features/                     # Feature modules (client-only)
│   ├── auth/
│   │   ├── components/           # login-form, signup-form, nav-user
│   │   ├── hooks/                # use-logout
│   │   └── services/             # auth client logic
│   ├── chat/
│   │   ├── components/           # chat-client, app-sidebar, prompt-area
│   │   ├── hooks/                # use-conversation-persistence
│   │   ├── services/             # chat client logic
│   │   ├── store/                # chat-store
│   │   ├── tools/                # AI SDK tools (datetime, weather, etc.)
│   │   ├── constants.ts          # Chat-specific constants
│   │   └── types.ts              # Chat types (ChatSession, ChatMessage, etc.)
│   └── settings/
│       ├── components/           # settings-modal
│       ├── hooks/                # use-settings-sync
│       ├── services/             # settings client logic
│       └── store/                # settings-store
│
├── components/                   # Shared UI primitives
│   ├── ai/                       # AI-specific UI components
│   │   ├── artifact.tsx
│   │   ├── canvas.tsx
│   │   ├── code-block.tsx
│   │   ├── message.tsx
│   │   ├── model-selector.tsx
│   │   ├── prompt-input.tsx
│   │   └── ... (30 total)
│   ├── ui/                       # Base UI components (Radix-based)
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   └── ... (54 total)
│   ├── layout/                   # App shell components
│   ├── feedback/                 # error-boundary, toasts
│   └── skeletons/                # Loading skeletons
│
├── hooks/                        # Shared cross-feature hooks
│   └── use-mobile.ts
│
├── lib/                          # Server-side utilities
│   ├── api/                      # API utilities (errors, validation, middleware)
│   ├── supabase/                 # Supabase clients and loaders
│   ├── agent/                    # Agent framework
│   ├── constants.ts
│   ├── logging.ts
│   ├── models.ts
│   ├── settings.ts
│   └── utils.ts
│
├── styles/                       # Global styles
│   └── globals.css
│
└── proxy.ts
```

## Architectural Principles

### 1. Feature-First Organization

- **Auth**, **Chat**, and **Settings** are isolated feature modules
- Each feature owns its client-side logic: components, hooks, stores, services, and types
- Features are self-contained and can be developed/tested independently

### 2. Strict Server/Client Boundaries

- **`src/lib/`**: Server-only utilities (Supabase, API middleware, logging)
- **`src/features/`**: Client-only feature logic
- **`src/app/`**: Routes that bridge server and client (Server Components, API handlers)

### 3. Shared UI Layers

- **`src/components/ai/`**: AI-specific primitives (messages, model selector, prompt input)
- **`src/components/ui/`**: Generic Radix-based components (buttons, dialogs, cards)
- **`src/components/layout/`**: App shell components
- **`src/components/feedback/`**: User feedback (error boundaries, toasts)

### 4. AI Tools as Chat Feature

- AI SDK tools moved from `src/tools/` to `src/features/chat/tools/`
- Tools are owned by the chat feature since they're chat-specific

### 5. Route Grouping

- `(auth)` route group for authentication pages
- `(chat)` route group for chat-related pages
- Clear separation of concerns in routing

## Import Paths

Key import patterns:

```typescript
// Feature modules
import { LoginForm } from "@/features/auth/components/login-form";
import { useChatStore } from "@/features/chat/store/chat-store";
import { ChatSession } from "@/features/chat/types";

// Shared components
import { Button } from "@/components/ui/button";
import { Message } from "@/components/ai/message";

// Server utilities
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { logError } from "@/lib/logging";
```

## Benefits

1. **Ownership**: Clear feature boundaries make it easy to identify who owns what
2. **Scalability**: New features can be added without cluttering top-level directories
3. **Reusability**: Shared UI components are clearly separated from feature-specific logic
4. **Type Safety**: Feature-specific types stay with their features
5. **Testing**: Features can be tested in isolation
6. **Performance**: Clear client/server boundaries enable better code splitting

## Migration Notes

All files have been moved and import paths updated. The build passes successfully with no errors.

Key changes:

- `src/components/ai-elements/` → `src/components/ai/`
- `src/components/chat-client.tsx` → `src/features/chat/components/chat-client.tsx`
- `src/store/chat-store.ts` → `src/features/chat/store/chat-store.ts`
- `src/types/chat.ts` → `src/features/chat/types.ts`
- `src/tools/` → `src/features/chat/tools/`
- `src/app/globals.css` → `src/styles/globals.css`
