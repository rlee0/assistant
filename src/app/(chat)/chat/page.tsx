import { ChatClient } from "@/features/chat/components/chat-client";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { loadInitialChats } from "@/lib/supabase/loaders";
import { logError } from "@/lib/logging";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * Error display component with accessibility support
 */
function ErrorDisplay({ message }: { message: string }): React.ReactElement {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <p className="text-sm text-red-600" role="alert">
        {message}
      </p>
      <Link href="/" className="text-sm text-blue-600 underline underline-offset-4">
        Back home
      </Link>
    </div>
  );
}

/**
 * Chat index page (serves /chat route)
 *
 * Responsibilities:
 * - Authentication verification
 * - Loading initial chat data from Supabase
 * - Passing data to client component
 * - Handling errors gracefully
 *
 * Note: Does NOT auto-redirect to first conversation.
 * Users must explicitly select a conversation or create new one.
 */
export default async function ChatIndexPage(): Promise<React.ReactElement> {
  // Step 1: Authenticate user
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    logError("[ChatIndexPage]", "Auth verification failed", authError);
    redirect("/login");
  }

  if (!user) {
    redirect("/login");
  }

  // Step 2: Load chat data
  let initialData;
  try {
    initialData = await loadInitialChats(user.id);
  } catch (error) {
    // Re-throw Next.js redirects (e.g., from other middleware)
    if (isRedirectError(error)) {
      throw error;
    }

    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logError("[ChatIndexPage]", "Failed to load chats", error, { userId: user.id });

    return <ErrorDisplay message={`Failed to load conversations: ${errorMessage}`} />;
  }

  // Step 3: Render chat interface with loaded data
  return <ChatClient initialData={initialData} />;
}
