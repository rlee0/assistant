# Quick Start Guide

This guide will help you get the AI Assistant chatbot running in under 10 minutes.

## Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works)
- Git installed

## Step-by-Step Setup

### 1. Clone and Install (2 minutes)

```bash
git clone <your-repo-url>
cd assistant
npm install
```

### 2. Setup Supabase (3 minutes)

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be ready (2-3 minutes)
3. Go to **Project Settings** > **API** and copy:
   - Project URL
   - anon/public key
   - service_role key (under "Project API keys" > Show)

### 3. Run Database Migration (1 minute)

1. In Supabase dashboard, go to **SQL Editor**
2. Click **+ New Query**
3. Copy the entire contents of `supabase/migrations/20231222000000_initial_schema.sql`
4. Paste into the SQL editor
5. Click **Run** (green play button)
6. You should see "Success. No rows returned"

### 4. Configure Environment (1 minute)

Create `.env.local` file in the project root:

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your-service-role-key

# AI Gateway (optional for now - app works without it)
NEXT_PUBLIC_AI_GATEWAY_URL=https://your-ai-gateway-url
AI_GATEWAY_API_KEY=your-ai-gateway-api-key
```

### 5. Run the App (30 seconds)

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## First Steps

### Create Your Account

1. Click **Sign up** on the homepage
2. Enter your email and password (minimum 6 characters)
3. Click **Create account**
4. You'll be redirected to the chat interface

### Start Chatting

1. Click **+ New Chat** in the sidebar
2. Type a message in the bottom input area
3. Press Enter or click the send button
4. You'll see a response (currently a stub - see below)

### Try Features

- **Pin a Chat**: Click the ⋮ menu in the toolbar > Pin Chat
- **Rename a Chat**: Click the ⋮ menu > Rename Chat
- **Delete a Chat**: Click the ⋮ menu > Delete Chat
- **Collapse Sidebar**: Click the ◀ icon in the sidebar
- **Access Settings**: Click the Settings button in the sidebar footer

## Optional: Setup OAuth (5 minutes)

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `https://xxxxx.supabase.co/auth/v1/callback`
6. In Supabase dashboard: **Authentication** > **Providers** > **Google**
7. Enable and paste your Client ID and Secret

### GitHub OAuth

1. Go to [GitHub Settings](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Set Authorization callback URL: `https://xxxxx.supabase.co/auth/v1/callback`
4. Copy Client ID and generate Client Secret
5. In Supabase dashboard: **Authentication** > **Providers** > **GitHub**
6. Enable and paste your Client ID and Secret

## Current Limitations (Stubs)

The following features return stub responses and are ready for integration:

- **AI Responses**: Currently returns stub text. Connect your AI Gateway to get real responses.
- **Model Selection**: Shows in dropdown but doesn't affect responses yet.
- **Tool Execution**: Tools are registered but return stub results.
- **Web Search**: Returns example results.
- **Calculator**: Returns placeholder message.
- **Code Runner**: Returns placeholder message.

## Next Steps

### Connect AI Gateway

1. Set up an AI Gateway endpoint (OpenAI-compatible API)
2. Add credentials to `.env.local`
3. Modify `/app/api/ai/chat/route.ts` to call your gateway
4. Restart the dev server

### Customize

- Add your own tools in `/tools` directory (see CONTRIBUTING.md)
- Modify the UI theme in `tailwind.config.ts`
- Add your branding to `/app/layout.tsx`

## Troubleshooting

### Build Errors

```bash
# Clear cache and rebuild
rm -rf .next
npm run build
```

### Database Errors

- Make sure the migration SQL ran successfully
- Check that RLS policies are enabled
- Verify your Supabase credentials in `.env.local`

### Auth Errors

- Check that NEXT_PUBLIC_SUPABASE_URL starts with `https://`
- Ensure the anon key is copied correctly (it's very long)
- For OAuth: verify redirect URIs match exactly

### Port Already in Use

```bash
# Use a different port
npm run dev -- -p 3001
```

## Getting Help

- Check the main [README.md](README.md) for detailed documentation
- Review [CONTRIBUTING.md](CONTRIBUTING.md) for tool development
- Open an issue on GitHub for bugs or questions

## Production Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Add environment variables from `.env.local`
5. Deploy

### Environment Variables for Production

Add all variables from `.env.local` to your hosting platform:

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- NEXT_PUBLIC_AI_GATEWAY_URL (optional)
- AI_GATEWAY_API_KEY (optional)

## Success!

You now have a working AI chatbot with:
- ✅ User authentication
- ✅ Chat management
- ✅ Settings persistence
- ✅ Tool system
- ✅ Modern UI

Ready to add your AI Gateway and start building!
