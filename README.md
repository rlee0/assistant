## Assistant chatbot

Next.js App Router experience powered by Supabase auth, ai-sdk chat streaming, configurable models, tool registry, and settings (UI + JSON editor).

### Required environment

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
AI_GATEWAY_URL=              # e.g. https://api.openai.com/v1 (or your gateway)
AI_GATEWAY_API_KEY=
AI_MODEL=gpt-4o-mini         # optional override
```

### Scripts

- `npm run dev` – local development
- `npm run build` – production build
- `npm run start` – start built app
- `npm run lint` – lint

### Features (high level)
- Supabase email/password + Google/GitHub OAuth.
- Chat layout with collapsible sidebar, pin/delete, checkpointing, editable/resend messages, streaming markdown via ai-sdk, canvas panel (browser/code/rich text placeholders), model selection fetched from AI gateway.
- Settings page with VS Code–like menu, generated forms from zod schemas, tool registry settings, JSON editor with Cmd/Ctrl+S save, back to chats.
