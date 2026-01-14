# AI Assistant

A modern, full-featured AI chat assistant built with Next.js, React, and Supabase. This application provides an intelligent conversational interface powered by multiple AI providers, with advanced UI components and comprehensive user management.

## ✨ Features

### 🤖 Multi-Provider AI Integration

- Support for multiple AI providers (OpenAI, Anthropic, Google, Meta, Mistral, DeepSeek, and more)
- Dynamic model selection with real-time provider switching
- Configurable temperature and model parameters
- AI SDK integration for streaming responses

### 💬 Advanced Chat Interface

- Real-time streaming chat with AI models
- Rich message formatting with Markdown and syntax highlighting (via Shiki)
- Context-aware conversations with message history
- Attachment support for enhanced interactions
- Speech input capabilities
- Tool integration for extended functionality

### 🎨 Rich UI Components

Comprehensive AI-specific components including:

- **Message Components**: Message bubbles, actions, and content rendering
- **Canvas & Artifacts**: Interactive visual elements for AI-generated content
- **Code Blocks**: Syntax-highlighted code with copy functionality
- **Chain of Thought**: Visualize AI reasoning processes
- **Checkpoints & Tasks**: Track progress and milestones
- **Web Preview**: Preview web content inline
- **Inline Citations & Sources**: Reference and verification support
- **Reasoning & Planning**: Visualize AI planning and decision-making

### 🔐 Authentication & User Management

- Secure authentication via Supabase Auth
- User signup and login flows
- Protected routes and session management
- Row-level security for data isolation

### ⚙️ Settings & Customization

- **Account Settings**: Manage user profile and credentials
- **Appearance**: Theme selection (light/dark/system) and UI density
- **Model Configuration**: Set default models, temperature, and API keys
- **Tool Settings**: Configure individual tool preferences
- Settings sync across devices via Supabase

### 🎨 Modern UI/UX

- Beautiful, responsive design with Tailwind CSS
- Dark mode support with next-themes
- Comprehensive component library powered by Radix UI
- Smooth animations with Motion
- Toast notifications with Sonner
- Accessible and keyboard-friendly interface

### 🛠️ Developer Experience

- TypeScript for type safety
- Zod for runtime validation
- React Hook Form for form management
- Zustand for state management
- ESLint for code quality
- pnpm for fast package management

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

   Run the migrations in your Supabase project:

   ```bash
   # The migrations are located in /supabase/migrations/
   # Apply them via Supabase CLI or Dashboard
   ```

   The migrations will create:

   - `settings` table for user preferences
   - Row-level security policies
   - Necessary triggers and functions

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
│   │   ├── api/                 # API routes
│   │   │   ├── account/         # Account management
│   │   │   ├── chat/            # Chat endpoints
│   │   │   ├── models/          # Model listing
│   │   │   └── settings/        # Settings CRUD
│   │   ├── settings/            # Settings page
│   │   ├── layout.tsx           # Root layout
│   │   ├── page.tsx             # Home page (chat)
│   │   └── globals.css          # Global styles
│   ├── components/
│   │   ├── ai-elements/         # AI-specific components
│   │   │   ├── artifact.tsx     # AI artifacts display
│   │   │   ├── canvas.tsx       # Interactive canvas
│   │   │   ├── chain-of-thought.tsx
│   │   │   ├── code-block.tsx   # Syntax highlighted code
│   │   │   ├── message.tsx      # Chat messages
│   │   │   ├── model-selector.tsx
│   │   │   ├── prompt-input.tsx # Chat input
│   │   │   ├── reasoning.tsx    # AI reasoning display
│   │   │   └── ...
│   │   └── ui/                  # Base UI components (Radix-based)
│   ├── hooks/                   # React hooks
│   ├── lib/                     # Utility libraries
│   │   ├── agent/              # Agent logic
│   │   ├── api/                # API helpers
│   │   ├── supabase/           # Supabase client & utilities
│   │   ├── constants.ts        # App constants
│   │   ├── models.ts           # Model management
│   │   ├── settings.ts         # Settings schema & defaults
│   │   └── utils.ts            # Utility functions
│   ├── store/                   # Zustand stores
│   ├── tools/                   # AI tool implementations
│   └── types/                   # TypeScript type definitions
├── supabase/
│   └── migrations/              # Database migrations
├── public/                      # Static assets
└── Configuration files
    ├── next.config.ts
    ├── tailwind.config.ts
    ├── tsconfig.json
    └── package.json
```

## 🔧 Key Technologies

### Frontend

- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **TypeScript 5** - Type safety
- **Tailwind CSS 4** - Utility-first CSS
- **Radix UI** - Headless UI components
- **Motion** - Animations
- **ai-elements** - AI-specific UI components

### AI & Chat

- **AI SDK** - Vercel AI SDK for streaming and tool use
- **@ai-sdk/react** - React hooks for AI interactions
- **@ai-sdk/openai** - OpenAI integration
- **@ai-sdk/gateway** - Multi-provider gateway

### Backend & Database

- **Supabase** - Backend as a Service (Auth, Database, Storage)
- **@supabase/ssr** - Server-side rendering support

### State & Forms

- **Zustand** - Lightweight state management
- **React Hook Form** - Form management
- **Zod** - Schema validation

### Additional Tools

- **Shiki** - Syntax highlighting
- **Streamdown** - Streaming markdown rendering (via AI SDK Elements)
- **date-fns** - Date utilities
- **lucide-react** - Icons

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
