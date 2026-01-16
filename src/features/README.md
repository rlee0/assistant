# Features Module (`/src/features`)

Feature-based organization of the application. Each feature is a self-contained module with its own components, hooks, services, and utilities.

## Directory Structure

```
features/
├── auth/           # Authentication feature
│   ├── components/ # Auth-specific components
│   ├── hooks/      # Auth-specific hooks
│   └── index.ts    # Feature barrel export
├── chat/           # Chat feature (see REFACTORING_SUMMARY.md)
│   ├── components/ # Chat UI components
│   ├── handlers/   # Business logic handlers
│   ├── hooks/      # Chat-specific hooks
│   ├── store/      # Zustand state management
│   ├── tools/      # AI SDK tool definitions
│   ├── utils/      # Chat utilities
│   ├── constants.ts# Chat-specific constants
│   ├── types.ts    # Chat type definitions
│   └── index.ts    # Feature barrel export
└── settings/       # Settings feature
    ├── components/ # Settings UI components
    ├── hooks/      # Settings-specific hooks
    ├── store/      # Settings state management
    └── index.ts    # Feature barrel export
```

## Features Overview

### Authentication (`/features/auth`)

User authentication and authorization:

- Login and signup forms
- User navigation component
- Logout functionality
- Session management

**Key exports:**

```typescript
import { LoginForm, SignupForm, NavUser, useLogout } from "@/features/auth";
```

### Chat (`/features/chat`)

Main chat interface and AI interactions:

- Real-time streaming chat with AI models
- Message history and persistence
- Tool integration (weather, date-time, etc.)
- Conversation management
- Model selection and configuration

**Key exports:**

```typescript
import {
  ChatClient,
  ChatHeader,
  ChatMessages,
  ChatInput,
  ChatSidebar,
  useChatHooks,
  useConversationManagement,
  useMessageEditing,
} from "@/features/chat";
```

See [REFACTORING_SUMMARY.md](./chat/REFACTORING_SUMMARY.md) for detailed chat feature documentation.

### Settings (`/features/settings`)

Application and user settings:

- Settings modal and UI
- Settings persistence and sync
- Zustand store for settings state

**Key exports:**

```typescript
import { SettingsModal, useSettingsSync, useSettingsStore } from "@/features/settings";
```

## Feature Design Principles

### 1. **Self-Contained**

Each feature should be independently testable and deployable.

### 2. **Clear Boundaries**

Features communicate through well-defined interfaces (props, events, shared state).

### 3. **Organized Structure**

Every feature follows a consistent directory structure:

- `components/` - React components
- `hooks/` - Custom React hooks
- `services/` - Business logic and API calls
- `store/` - State management (Zustand)
- `utils/` - Feature-specific utilities
- `types.ts` - TypeScript type definitions
- `constants.ts` - Feature-specific constants
- `index.ts` - Barrel export file

### 4. **Barrel Exports**

Each feature has an `index.ts` that exports all public APIs:

```typescript
// Good: Clean, organized exports
export { Component1, Component2 } from "./components";
export { useHook1, useHook2 } from "./hooks";
export type { Type1, Type2 } from "./types";
```

### 5. **Proper Type Organization**

- Feature-specific types in `types.ts`
- Shared types in `/lib/types`
- Export types for consumers

### 6. **Documentation**

- JSDoc comments on all exports
- README.md for complex features
- Code examples in documentation

## Adding a New Feature

1. **Create feature directory**: `features/my-feature/`
2. **Add subdirectories**: `components/`, `hooks/`, etc.
3. **Define types**: Create `types.ts` with TypeScript interfaces
4. **Add constants**: Create `constants.ts` if needed
5. **Implement components**: Build React components
6. **Create barrel export**: Add `index.ts` with organized exports
7. **Add documentation**: Create README.md if complex
8. **Update parent index**: Add feature to `/features/index.ts` if needed

## Best Practices

1. **Import from barrel exports**:

   ```typescript
   // Good
   import { ChatClient } from "@/features/chat";

   // Avoid (breaks encapsulation)
   import { ChatClient } from "@/features/chat/components/chat-client";
   ```

2. **Keep features focused**: Don't let features grow too large
3. **Extract shared code to /lib**: If used by multiple features
4. **Use feature flags**: For experimental features
5. **Document breaking changes**: Update README when APIs change
