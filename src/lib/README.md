# Library Module (`/src/lib`)

Core utilities, constants, and shared functionality used throughout the application.

## Directory Structure

```
lib/
├── agent/           # AI agent utilities and types
├── api/             # API utilities, error handling, validation
├── constants/       # Application-wide constants (organized by domain)
├── supabase/        # Supabase client utilities and loaders
├── types/           # Shared TypeScript type definitions
├── index.ts         # Main barrel export
├── logging.ts       # Structured logging utilities
├── models.ts        # AI model utilities and type guards
├── settings.ts      # Settings schema and defaults
└── utils.ts         # General utility functions
```

## Key Modules

### API (`/lib/api`)

Centralized API utilities for:

- **Error handling**: Custom error classes and handlers
- **Validation**: Request/response validation with Zod
- **Middleware**: Request parsing and processing
- **Routes**: Type-safe API route definitions
- **Results**: Result type for functional error handling

**Usage:**

```typescript
import { APIError, handleAPIError, validateString } from "@/lib/api";
// or use namespaced import
import * as api from "@/lib/api";
```

### Constants (`/lib/constants`)

Application-wide constants organized by domain:

- **chat.ts**: Chat feature defaults and suggestions
- **models.ts**: AI model configuration and defaults
- **settings.ts**: User settings defaults
- **tools.ts**: AI tool configuration and limits

**Usage:**

```typescript
// Import specific constants from domain modules
import { DEFAULT_MODEL, DEFAULT_TEMPERATURE } from "@/lib/constants/models";
import { DEFAULT_CHAT_TITLE } from "@/lib/constants/chat";
import { DEFAULT_THEME } from "@/lib/constants/settings";
import { BROWSER_DEFAULT_ENABLED } from "@/lib/constants/tools";
```

### Supabase (`/lib/supabase`)

Supabase client factories and utilities:

- **browser-client.ts**: Browser-side Supabase client
- **server-client.ts**: Server-side Supabase client with SSR support
- **loaders.ts**: Data loaders for common queries
- **settings.ts**: Settings persistence with Supabase

**Usage:**

```typescript
import { createSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
```

### Types (`/lib/types`)

Shared TypeScript type definitions used across features:

- Common API response shapes
- Pagination types
- Utility types (DeepPartial, DeepReadonly, etc.)

**Usage:**

```typescript
import type { APIResponse, PaginatedResponse, ID } from "@/lib/types";
```

## Best Practices

1. **Import from barrel exports**: Use `@/lib/api` instead of `@/lib/api/errors` when possible
2. **Use namespaced imports for clarity**: `import * as api from "@/lib/api"` for related utilities
3. **Keep feature-specific code in features**: Don't add feature-specific logic to lib
4. **Maintain backward compatibility**: When refactoring, provide deprecation notices
5. **Document all exports**: Use JSDoc comments for all exported functions and types

## Design Principles

- **Single Responsibility**: Each module has a clear, focused purpose
- **Type Safety**: Leverage TypeScript for compile-time safety
- **Immutability**: Prefer readonly types and const assertions
- **Functional Programming**: Pure functions with explicit inputs/outputs
- **Zero Dependencies**: Minimize dependencies to avoid bloat
