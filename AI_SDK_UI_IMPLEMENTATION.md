# AI SDK UI Implementation

## Overview

This project has been completely migrated to use **AI SDK UI** (`@ai-sdk/react`) from Vercel's AI SDK. The new implementation provides a modern, streaming-first chat experience with built-in state management.

## Key Changes

### 1. API Route (`/src/app/api/chat/route.ts`)

**Changes:**

- Updated to use `UIMessage` type instead of `ModelMessage`
- Added `convertToModelMessages()` to convert UIMessages to ModelMessages
- Changed response from `toTextStreamResponse()` to `toUIMessageStreamResponse()`
- Added `maxDuration = 30` for streaming timeout

**Key Features:**

- Full support for tool calling
- Proper message streaming with UI-optimized format
- Maintains context injection capability
- Tool settings integration from Supabase

### 2. Chat Client (`/src/components/chat-client.tsx`)

**Complete Rewrite:**

- Now uses the `useChat` hook from `@ai-sdk/react`
- Uses `DefaultChatTransport` for API communication
- Full TypeScript type safety with UIMessage types

**Features Implemented:**

- ✅ Real-time message streaming
- ✅ Status indicators (ready, submitted, streaming, error)
- ✅ Stop generation capability
- ✅ Auto-scrolling to latest message
- ✅ Keyboard shortcuts (Enter to send, Shift+Enter for new line)
- ✅ New chat functionality
- ✅ Tool call visualization
- ✅ Image attachment support
- ✅ Error handling with user-friendly messages
- ✅ Loading states with spinner
- ✅ Responsive layout with sidebar

**UI Components:**

- Sidebar with new chat button
- Scrollable message area
- Resizable textarea input
- Send/Stop buttons based on state
- Message components with role-based styling

## State Management

**Chat State:** Managed entirely by the `useChat` hook from `@ai-sdk/react`

- Messages array with streaming support
- Input state management
- Status tracking (ready, submitted, streaming, error)
- No external store needed

**Settings State:** Managed by Zustand store (`src/store/settings-store.ts`)

- User configuration preferences
- Form state management
- Local persistence with hydration

## AI SDK UI Benefits

### 1. **Streaming-First Architecture**

- Messages stream in real-time as they're generated
- Partial message updates for better UX
- Automatic handling of streaming chunks

### 2. **Built-in State Management**

- No need for external state management (Zustand, Redux)
- Automatic message list updates
- Status tracking (ready, submitted, streaming, error)

### 3. **Type Safety**

- Full TypeScript support with `UIMessage` type
- Type-safe tool invocations
- Proper type inference for message parts

### 4. **Message Parts System**

Modern message format with different part types:

- `text`: Regular text content
- `tool-*`: Tool invocations with states (input-streaming, complete, etc.)
- `file`: File attachments (images, documents)
- `reasoning`: Model reasoning steps
- `source-url` / `source-document`: Citation sources

### 5. **Advanced Features Ready**

- Tool calling support out of the box
- File attachments (images, documents)
- Multi-modal content
- Reasoning visualization
- Source citations

## Architecture

```
┌─────────────────────────────────────────┐
│          Chat Client (React)            │
│  ┌───────────────────────────────────┐  │
│  │   useChat Hook                    │  │
│  │   - messages: UIMessage[]         │  │
│  │   - sendMessage()                 │  │
│  │   - status, error, stop           │  │
│  └───────────────────────────────────┘  │
│              ↓ ↑                        │
│     DefaultChatTransport                │
└──────────────┬──────────────────────────┘
               │ POST /api/chat
               ↓
┌─────────────────────────────────────────┐
│       API Route Handler                 │
│  ┌───────────────────────────────────┐  │
│  │  convertToModelMessages()         │  │
│  │  streamText()                     │  │
│  │  toUIMessageStreamResponse()      │  │
│  └───────────────────────────────────┘  │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│      AI Provider (OpenAI/Gateway)       │
│      - Tools execution                  │
│      - Streaming response               │
└─────────────────────────────────────────┘
```

## Migration Notes

### For Future Developers

1. **Adding Features:**

   - Message persistence: Can integrate with Supabase for chat history
   - Custom transports: See [Transport API docs](https://ai-sdk.dev/docs/ai-sdk-ui/transport)
   - Tool UI: Render custom UI for specific tools
   - File uploads: Already supported, needs UI integration

2. **Customization Points:**

   - Transport: `DefaultChatTransport` can be replaced with custom implementation
   - Message rendering: Update the message mapping logic in chat-client.tsx
   - Error handling: Customize error messages and retry logic
   - Metadata: Add custom metadata to messages for tracking

3. **Best Practices:**
   - Use request-level options in `sendMessage()` for per-request customization
   - Implement proper error boundaries for React components
   - Add loading skeletons for better perceived performance
   - Consider implementing message persistence for chat history

## Testing Checklist

- [ ] Send a simple text message
- [ ] Test streaming (watch message appear in real-time)
- [ ] Stop generation mid-stream
- [ ] Test tool calling (if tools are configured)
- [ ] Test error handling (disable API key temporarily)
- [ ] Test keyboard shortcuts (Enter, Shift+Enter)
- [ ] Test new chat functionality
- [ ] Test mobile responsiveness
- [ ] Test sidebar toggle
- [ ] Verify auto-scroll behavior

## Resources

- [AI SDK UI Documentation](https://ai-sdk.dev/docs/ai-sdk-ui)
- [useChat Hook Reference](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot)
- [Transport API](https://ai-sdk.dev/docs/ai-sdk-ui/transport)
- [Message Metadata](https://ai-sdk.dev/docs/ai-sdk-ui/message-metadata)
- [Tool Usage](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage)

## Implementation Date

January 11, 2026

## Dependencies

- `@ai-sdk/react`: ^3.0.29 (already installed)
- `ai`: Latest (for types and utilities)
- `@ai-sdk/openai`: ^3.0.7 (for OpenAI provider)
