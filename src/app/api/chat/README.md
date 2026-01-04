# Chat API Documentation

## Overview

The Chat API provides complete CRUD (Create, Read, Update, Delete) operations for managing chat sessions. All endpoints require authentication via Supabase auth.

## Base URL

```
/api/chat
```

## Authentication

All endpoints require a valid authentication token. Users can only access and modify their own chats.

## Endpoints

### 1. Stream Chat Messages (Existing)

**POST** `/api/chat`

Streams chat responses using AI models with tool support.

**Request Body:**

```typescript
{
  messages: CoreMessage[];      // Required: Array of chat messages
  model?: string;               // Optional: AI model to use (default: gpt-4o-mini)
  context?: string;             // Optional: System context for the conversation
}
```

**Response:**

- Streams text response from AI model
- Status: 200 OK (stream)
- Status: 400 Bad Request (validation error)
- Status: 500 Internal Server Error

**Example:**

```typescript
const response = await fetch("/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    messages: [{ role: "user", content: "Hello!" }],
    model: "gpt-4o-mini",
    context: "You are a helpful assistant.",
  }),
});
```

---

### 2. Get Chat Sessions

**GET** `/api/chat/sessions`

Retrieves all chat sessions for the authenticated user or a specific chat by ID.

**Query Parameters:**

- `id` (optional): Specific chat ID to retrieve

**Response (all chats):**

```typescript
{
  chats: Record<string, ChatSession>;
  order: string[];
  selectedId?: string;
}
```

**Response (single chat):**

```typescript
{
  chat: ChatSession;
}
```

**Example:**

```typescript
// Get all chats
const response = await fetch("/api/chat/sessions");
const { chats, order } = await response.json();

// Get specific chat
const response = await fetch("/api/chat/sessions?id=chat-uuid");
const { chat } = await response.json();
```

**Status Codes:**

- 200: Success
- 401: Not authenticated
- 404: Chat not found (when ID specified)
- 500: Internal server error

---

### 3. Create Chat

**POST** `/api/chat/create`

Creates a new chat session for the authenticated user.

**Request Body:**

```typescript
{
  title?: string;        // Optional: Chat title (default: "New chat")
  model?: string;        // Optional: AI model (default: "gpt-4o-mini")
  context?: string;      // Optional: System context
  pinned?: boolean;      // Optional: Pin status (default: false)
}
```

**Response:**

```typescript
{
  success: true;
  chat: ChatSession;
}
```

**Example:**

```typescript
const response = await fetch("/api/chat/create", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    title: "My New Chat",
    model: "gpt-4o",
    context: "You are a coding assistant.",
    pinned: true,
  }),
});
const { chat } = await response.json();
```

**Status Codes:**

- 201: Created successfully
- 400: Validation error
- 401: Not authenticated
- 500: Internal server error

---

### 4. Update Chat

**PATCH** `/api/chat/update` or **PUT** `/api/chat/update`

Updates an existing chat session. At least one field must be provided for update.

**Request Body:**

```typescript
{
  id: string;                  // Required: Chat ID
  title?: string;              // Optional: Update title
  pinned?: boolean;            // Optional: Update pin status
  messages?: ChatMessage[];    // Optional: Update messages
}
```

**Response:**

```typescript
{
  success: true;
  chat: {
    id: string;
    title: string;
    pinned: boolean;
    updatedAt: string;
  }
}
```

**Example:**

```typescript
const response = await fetch("/api/chat/update", {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    id: "chat-uuid",
    title: "Updated Title",
    pinned: true,
    messages: [{ id: "msg-1", role: "user", content: "Hello", createdAt: "2026-01-04T00:00:00Z" }],
  }),
});
const { chat } = await response.json();
```

**Status Codes:**

- 200: Updated successfully
- 400: Validation error
- 401: Not authenticated
- 404: Chat not found
- 500: Internal server error

---

### 5. Delete Chat

**DELETE** `/api/chat/delete`

Deletes a chat session and all associated messages and checkpoints.

**Request Body:**

```typescript
{
  id: string; // Required: Chat ID to delete
}
```

**Response:**

```typescript
{
  success: true;
  message: "Chat deleted successfully";
}
```

**Example:**

```typescript
const response = await fetch("/api/chat/delete", {
  method: "DELETE",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    id: "chat-uuid",
  }),
});
const { success } = await response.json();
```

**Status Codes:**

- 200: Deleted successfully
- 400: Validation error
- 401: Not authenticated
- 404: Chat not found
- 500: Internal server error

---

## Data Types

### ChatSession

```typescript
{
  id: string;
  title: string;
  pinned: boolean;
  updatedAt: string;
  model: string;
  context?: string;
  suggestions: string[];
  messages: ChatMessage[];
  checkpoints: ChatCheckpoint[];
}
```

### ChatMessage

```typescript
{
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string | unknown;
  createdAt: string;
}
```

### ChatCheckpoint

```typescript
ChatMessage[]  // Array of messages representing a checkpoint
```

---

## Error Handling

All endpoints return consistent error responses:

```typescript
{
  error: string; // Human-readable error message
}
```

Common errors:

- **400 Bad Request**: Invalid request body or parameters
- **401 Unauthorized**: Not authenticated
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Server-side error

---

## Security

- All endpoints require Supabase authentication
- Users can only access their own chats
- Chat IDs must be valid UUIDs
- Cascade deletion ensures related data is cleaned up

---

## Database Schema

The API interacts with the following tables:

**chats**

- `id` (uuid, primary key)
- `user_id` (uuid, foreign key)
- `title` (text)
- `is_pinned` (boolean)
- `updated_at` (timestamp)

**messages**

- `id` (uuid, primary key)
- `chat_id` (uuid, foreign key)
- `role` (text)
- `content` (text)
- `created_at` (timestamp)

**checkpoints**

- `id` (uuid, primary key)
- `chat_id` (uuid, foreign key)
- `payload` (jsonb)
- `created_at` (timestamp)

---

## Best Practices

1. **Always validate chat IDs** before operations
2. **Use PATCH for partial updates** vs PUT for full replacement
3. **Handle errors gracefully** on the client side
4. **Implement optimistic UI updates** for better UX
5. **Sync with Zustand store** after successful API operations
6. **Normalize message IDs** for consistency
