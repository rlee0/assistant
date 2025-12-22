# AI Assistant Chatbot

A comprehensive Next.js chatbot application with Supabase authentication, AI Gateway integration, and extensible tool system.

## Features

### Authentication
- Email/password authentication via Supabase
- Google OAuth integration
- GitHub OAuth integration
- Protected routes with middleware

### Chat Features
- Create, list, and manage multiple chat conversations
- Pin/unpin important chats
- Soft delete chats
- Auto-generated chat titles (cost-efficient)
- Real-time message streaming with Markdown support
- Editable messages with resend capability
- Checkpoint restore functionality
- Collapsible sidebar with chat history
- Breadcrumbs toolbar showing title, modified date, and actions

### AI Integration
- Dynamic model selection from AI Gateway
- Streaming responses with tool support
- Temperature and parameter controls
- Cost-efficient endpoints for titles and suggestions
- Generative UI with canvas support

### Tool System
- Auto-discovery and registration of tools
- Starter tools included:
  - Web search (stub)
  - Calculator
  - Code runner (stub)
- Tool-specific settings encapsulation
- Easy addition of new tools without modifying core code

### Settings
- VS Code-like settings interface
- Config-driven UI from Zod schemas
- JSON editor view with Cmd/Ctrl+S save
- Nested settings support
- User profile management
- Password change
- Appearance settings
- Tool selection and configuration
- Model preferences
- AI Gateway API key management
- Account deletion

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Authentication**: Supabase Auth
- **Database**: Supabase (PostgreSQL with RLS)
- **State Management**: Zustand
- **AI**: ai-sdk with ai-gateway integration
- **Forms/Validation**: Zod
- **Data Fetching**: SWR

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Supabase account and project
- AI Gateway endpoint (optional for development)
- Google OAuth credentials (optional)
- GitHub OAuth credentials (optional)

### Environment Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd assistant
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file based on `.env.example`:
```bash
cp .env.example .env.local
```

4. Configure environment variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI Gateway
NEXT_PUBLIC_AI_GATEWAY_URL=https://your-ai-gateway-url
AI_GATEWAY_API_KEY=your-ai-gateway-api-key

# Tool-specific (optional)
WEB_SEARCH_API_KEY=your-web-search-api-key
CODE_RUNNER_API_KEY=your-code-runner-api-key
```

### Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)

2. Run the database migrations:
   - Go to the SQL Editor in your Supabase dashboard
   - Copy the contents of `supabase/migrations/20231222000000_initial_schema.sql`
   - Execute the SQL to create all tables and RLS policies

3. Configure OAuth providers (optional):
   - Go to Authentication > Providers in Supabase dashboard
   - Enable and configure Google OAuth:
     - Get credentials from [Google Cloud Console](https://console.cloud.google.com/)
     - Add authorized redirect URI: `https://<your-project>.supabase.co/auth/v1/callback`
   - Enable and configure GitHub OAuth:
     - Get credentials from [GitHub Developer Settings](https://github.com/settings/developers)
     - Add authorization callback URL: `https://<your-project>.supabase.co/auth/v1/callback`

### AI Gateway Setup

The application expects an AI Gateway endpoint that provides:
- `GET /models` - Returns list of available AI models
- `POST /chat` - Streaming chat completions endpoint

For development, you can use any OpenAI-compatible API or create a simple proxy.

### Running the Application

1. Development mode:
```bash
npm run dev
```

2. Build for production:
```bash
npm run build
npm start
```

3. Lint:
```bash
npm run lint
```

The application will be available at `http://localhost:3000`

## Project Structure

```
assistant/
├── app/                      # Next.js app router pages
│   ├── (auth)/              # Auth group (login, signup)
│   ├── (protected)/         # Protected routes (chat, settings)
│   ├── api/                 # API routes
│   └── globals.css          # Global styles
├── components/              # React components
│   ├── ui/                  # shadcn/ui components
│   ├── chat/                # Chat-specific components
│   ├── settings/            # Settings components
│   └── auth/                # Auth components
├── lib/                     # Utility libraries
│   ├── supabase/           # Supabase client configurations
│   ├── ai/                 # AI Gateway and tool registry
│   └── utils/              # Utility functions
├── store/                   # Zustand state stores
│   ├── chat-store.ts       # Chat state
│   ├── settings-store.ts   # Settings state
│   └── ui-store.ts         # UI state
├── types/                   # TypeScript type definitions
├── tools/                   # Tool implementations
│   ├── web-search/         # Web search tool
│   ├── calculator/         # Calculator tool
│   └── code-runner/        # Code runner tool
├── supabase/
│   └── migrations/         # Database migrations
└── middleware.ts           # Next.js middleware for auth

```

## Adding New Tools

Tools are auto-discovered and integrated into the system automatically. To add a new tool:

1. Create a new directory in `tools/`:
```bash
mkdir tools/my-tool
```

2. Create an `index.ts` file with your tool definition:
```typescript
import { z } from 'zod';
import { ToolDefinition } from '@/types/tools';

export const myToolSettingsSchema = z.object({
  apiKey: z.string().optional(),
  enabled: z.boolean().default(true),
});

export const myTool: ToolDefinition = {
  name: 'my_tool',
  description: 'Description of what my tool does',
  parameters: z.object({
    input: z.string().describe('Input parameter'),
  }),
  execute: async (params) => {
    // Implementation
    return { result: 'output' };
  },
  settingsSchema: myToolSettingsSchema,
};
```

3. Register in `lib/ai/tool-registry.ts`:
```typescript
import { myTool } from '@/tools/my-tool';

const availableTools: ToolDefinition[] = [
  // ... existing tools
  myTool,
];
```

The tool will automatically appear in the settings UI with its own configuration section.

## Database Schema

The application uses the following main tables:

- **users** - User profiles (extends auth.users)
- **accounts** - OAuth provider accounts
- **chats** - Chat conversations
- **messages** - Chat messages
- **checkpoints** - Conversation checkpoints for restore
- **settings** - User settings (JSON)
- **tools** - Available tools registry
- **tool_settings** - Per-user tool configurations
- **model_preferences** - User model preferences

All tables have Row Level Security (RLS) enabled to ensure users can only access their own data.

## Features in Detail

### Chat Interface
- Collapsible sidebar showing chat history
- Pinned chats appear at the top
- Click to select and load a chat
- Breadcrumb toolbar with dropdown for pin/delete actions
- Bottom-pinned prompt area with model selector
- Real-time streaming responses
- Edit any message and resend
- Create checkpoints to restore conversation state

### Settings Interface
- Left navigation menu
- Form view with auto-generated UI from schemas
- JSON editor for advanced users
- Keyboard shortcut (Cmd/Ctrl+S) to save in JSON mode
- Tool-specific settings automatically displayed
- Profile management and password change
- Account deletion

### Security
- Row Level Security (RLS) on all database tables
- Environment variable-based secrets
- Protected routes via middleware
- Secure password handling via Supabase Auth

## Development Notes

- The application uses Server Components where possible for better performance
- Client components are marked with 'use client' directive
- API routes handle server-side operations and database access
- Optimistic updates in Zustand for better UX
- SWR for efficient data fetching and caching

## License

MIT