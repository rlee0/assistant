# AI Assistant

A modern, full-featured AI chat assistant built with Next.js, React, and Supabase. This application provides an intelligent conversational interface powered by multiple AI providers, with advanced UI components and comprehensive user management.

## ✨ Features

### 🤖 Multi-Provider AI Integration

- Support for multiple AI providers (OpenAI, Anthropic, Google, Meta, Mistral, DeepSeek, and more)
- Dynamic model selection with real-time provider switching
- Configurable temperature and model parameters
- Streaming responses for real-time interaction
- AI SDK integration with tool use capabilities

### 💬 Advanced Chat Interface

- Real-time streaming chat with multiple AI models
- Persistent chat history with Supabase
- Rich message formatting with Markdown and syntax highlighting (via Shiki)
- Context-aware conversations with full message history
- Attachment support for enhanced interactions
- Speech input capabilities
- Tool integration for extended functionality
- Message actions and controls

### 🎨 Rich AI Components

Comprehensive components for visualizing AI processes:

- **Message Display**: Message bubbles with streaming support
- **Code Blocks**: Syntax-highlighted code with copy functionality
- **Chain of Thought**: Visualize AI reasoning processes
- **Checkpoints & Planning**: Track AI decision-making and plan execution
- **Canvas & Artifacts**: Interactive visual elements for AI-generated content
- **Connections & Graphs**: Visual representation of AI workflows via @xyflow/react
- **Inline Citations**: Reference and source attribution
- **Conversation Threading**: Organized message hierarchies

### 🔐 Authentication & User Management

- Secure authentication via Supabase Auth
- User signup and login flows
- Protected routes with session management
- Row-level security (RLS) for data isolation
- Account settings and profile management

### ⚙️ Settings & Customization

- **Account Settings**: Manage user profile and API credentials
- **Appearance**: Theme selection (light/dark/system) and UI density customization
- **Model Configuration**: Set default models, temperature, and configure API keys
- **Tool Settings**: Enable/disable and configure individual tool preferences
- Settings persistence with cross-device sync via Supabase

### 🎨 Modern UI/UX

- Beautiful, responsive design with Tailwind CSS
- Dark mode support with next-themes
- Comprehensive component library powered by Radix UI
- Smooth animations and transitions with Motion
- Toast notifications with Sonner
- Accessible and keyboard-friendly interface
- Loading skeletons for better UX

### 🛠️ Developer Experience

- TypeScript for type safety and IDE support
- Zod for runtime schema validation
- React Hook Form for efficient form management
- Zustand for lightweight state management
- ESLint for code quality
- pnpm for fast, deterministic package management
- Well-organized feature modules

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm 10.28.0+
- Supabase account and project

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd assistant
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   Create a `.env.local` file in the root directory:

   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

   # AI Provider API Keys (optional, can be set in UI)
   OPENAI_API_KEY=your_openai_api_key
   ANTHROPIC_API_KEY=your_anthropic_api_key
   ```

4. **Set up Supabase**

   Apply the database migrations to your Supabase project:

   ```bash
   # Option 1: Using Supabase CLI
   supabase migration list  # View all migrations
   supabase db push        # Apply migrations to remote database

   # Option 2: Manual application via Supabase Dashboard
   # - Go to SQL Editor in your Supabase project
   # - Copy and paste migration files from /supabase/migrations/
   # - Execute them in numerical order
   ```

   The migrations create:

   - `chats`, `messages` - Chat history and messaging tables
   - `checkpoints` - AI reasoning/chain-of-thought tracking
   - `settings` - User preferences and configuration
   - `delete_own_account()` - Secure account deletion function
   - Row-level security (RLS) policies for data isolation
   - Indexes for performance optimization

   See [supabase/README.md](supabase/README.md) for detailed database documentation.

5. **Run the development server**

   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
assistant/
├── src/
│   ├── app/                      # Next.js app directory
│   │   ├── (auth)/              # Authentication routes
│   │   │   ├── login/           # Login page
│   │   │   └── signup/          # Signup page
│   │   ├── (chat)/              # Chat layout wrapper
│   │   │   ├── page.tsx         # Main chat interface
│   │   │   └── chat/            # Chat routes
│   │   ├── api/                 # API routes
│   │   │   ├── account/         # Account management
│   │   │   ├── auth/            # Authentication endpoints
│   │   │   ├── chat/            # Chat streaming endpoints
│   │   │   ├── models/          # Available models endpoint
│   │   │   └── settings/        # Settings CRUD
│   │   ├── settings/            # Settings page
│   │   ├── layout.tsx           # Root layout
│   │   └── globals.css          # Global styles
│   ├── components/
│   │   ├── ai/                  # AI-specific components
│   │   │   ├── artifact.tsx     # AI artifacts display
│   │   │   ├── canvas.tsx       # Interactive canvas
│   │   │   ├── chain-of-thought.tsx
│   │   │   ├── code-block.tsx   # Syntax highlighted code
│   │   │   ├── message.tsx      # Chat messages
│   │   │   ├── model-selector.tsx
│   │   │   ├── conversation.tsx # Chat conversation wrapper
│   │   │   └── ...
│   │   ├── feedback/            # User feedback components
│   │   ├── providers/           # Context providers
│   │   ├── skeletons/           # Loading skeleton components
│   │   └── ui/                  # Base UI components (Radix-based)
│   ├── features/                # Feature modules
│   │   ├── auth/               # Auth feature logic
│   │   ├── chat/               # Chat feature logic
│   │   └── settings/           # Settings feature logic
│   ├── hooks/                   # React hooks
│   │   ├── use-async-transition.ts
│   │   ├── use-loading-state.ts
│   │   ├── use-optimistic-action.ts
│   │   └── ...
│   ├── lib/                     # Utility libraries
│   │   ├── agent/              # Agent logic
│   │   ├── api/                # API helpers
│   │   ├── supabase/           # Supabase client & utilities
│   │   ├── constants.ts        # App constants
│   │   ├── models.ts           # Model management
│   │   ├── settings.ts         # Settings schema & defaults
│   │   ├── logging.ts          # Logging utilities
│   │   └── utils.ts            # Utility functions
│   ├── styles/                  # Global styles
│   │   └── globals.css
│   └── proxy.ts                 # Proxy configuration
├── supabase/
│   ├── migrations/              # Database migrations (apply in order)
│   ├── schema.sql              # Complete schema reference
│   ├── verify_complete_schema.sql  # Schema verification script
│   ├── RESET_AND_SETUP.sql     # Development reset script
│   ├── MIGRATION_ORDER.md      # Migration documentation
│   └── README.md               # Database documentation
├── public/                      # Static assets
└── Configuration files
    ├── next.config.ts
    ├── tsconfig.json
    ├── eslint.config.mjs
    ├── components.json
    ├── package.json
    ├── pnpm-lock.yaml
    └── postcss.config.mjs
```

## 🔧 Key Technologies

### Frontend

- **Next.js 15+** - React framework with App Router
- **React 19** - UI library
- **TypeScript 5** - Type safety
- **Tailwind CSS** - Utility-first CSS
- **Radix UI** - Headless UI components
- **Motion** - Smooth animations
- **ai-elements** - AI-specific UI components

### AI & Chat

- **AI SDK v6+** - Vercel AI SDK for streaming and tool use
- **@ai-sdk/react** - React hooks for AI interactions
- **@ai-sdk/openai** - OpenAI integration
- **@ai-sdk/gateway** - Multi-provider AI gateway

### Backend & Database

- **Supabase** - Backend as a Service (Auth, Database, Storage)
- **@supabase/supabase-js** - Supabase client library
- **@supabase/ssr** - Server-side rendering support

### State & Forms

- **Zustand** - Lightweight state management
- **React Hook Form** - Form management
- **Zod** - Schema validation

### UI & Visualization

- **@xyflow/react** - Node-based UI library for canvas/graph components
- **Shiki** - Syntax highlighting for code blocks
- **lucide-react** - Icon library
- **Sonner** - Toast notifications
- **date-fns** - Date utilities

### Development

- **ESLint** - Code quality and linting
- **pnpm** - Fast, efficient package manager
- **TypeScript** - Type safety throughout the codebase

## 🎯 Usage

### Basic Chat

1. **Sign up or log in** to access the chat interface
2. **Select an AI model** from the model selector
3. **Type your message** in the prompt input
4. **Add attachments** (optional) using the attachment button
5. **Send** and receive streaming AI responses

### Model Configuration

Navigate to Settings → Models to:

- Set your default AI model
- Configure temperature (creativity level)
- Add API keys for different providers
- View available models

### Appearance Customization

Navigate to Settings → Appearance to:

- Choose theme (light, dark, or system)
- Adjust UI density (comfortable or compact)

### Tool Integration

The assistant supports various tools for enhanced functionality:

- Date/time operations
- Custom tool implementations in `/src/tools/`

## 🔒 Security

- **Row-Level Security (RLS)**: All database queries are protected with RLS policies
- **Authentication**: Secure authentication via Supabase Auth
- **API Key Management**: API keys can be stored securely in user settings
- **Environment Variables**: Sensitive data stored in environment variables
- **HTTPS Only**: Production deployments should use HTTPS

## 🚢 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables
4. Deploy

### Other Platforms

The application can be deployed to any platform that supports Next.js:

- Netlify
- Railway
- Self-hosted

Ensure you set the required environment variables on your deployment platform.

## 📝 Development

### Available Scripts

```bash
# Development
pnpm dev          # Start development server

# Build
pnpm build        # Build for production
pnpm start        # Start production server

# Linting
pnpm lint         # Run ESLint
```

### Adding New Components

UI components are located in:

- `/src/components/ui/` - Base components (buttons, inputs, etc.)
- `/src/components/ai-elements/` - AI-specific components

### Adding New Tools

1. Create a new tool file in `/src/tools/`
2. Export the tool configuration
3. Add to the tools index
4. Update settings schema if needed

### Database Changes

1. Create a new migration in `/supabase/migrations/`
2. Follow the naming convention: `YYYYMMDDHHMMSS_description.sql`
3. Test locally before applying to production

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [Radix UI](https://www.radix-ui.com/)
- AI integration via [Vercel AI SDK](https://sdk.vercel.ai/)
- Backend powered by [Supabase](https://supabase.com/)
- AI elements from [ai-elements](https://www.npmjs.com/package/ai-elements)

## 📞 Support

For issues and questions:

- Open an issue on GitHub
- Check existing documentation
- Review the code comments

## 🗺️ Roadmap

Future enhancements:

- [ ] Multi-modal support (images, audio)
- [ ] Chat history and search
- [ ] Conversation sharing
- [ ] Custom tool marketplace
- [ ] Advanced prompt templates
- [ ] Team collaboration features
- [ ] Analytics and usage tracking

---

Built with ❤️ using Next.js and AI
