import { ChatClient } from "@/features/chat/components/chat-client";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { loadInitialChats } from "@/lib/supabase/loaders";
import { logError } from "@/lib/logging";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface ChatPageProps {
  params: Promise<{
    id: string;
  }>;
}

async function verifyChatAccess(userId: string) {
  const initialChats = await loadInitialChats(userId);
  return initialChats;
}

function ErrorDisplay() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <p className="text-sm text-red-600">
        Failed to load conversation. The chat may not exist or you do not have access to it.
      </p>
      <Link href="/" className="text-sm text-blue-600 underline underline-offset-4">
        Back to chats
      </Link>
    </div>
  );
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { id: conversationId } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    logError("[ChatPage]", "Auth verification failed", error);
    redirect("/login");
  }

  if (!user) {
    redirect("/login");
  }

  let initialChats;
  try {
    initialChats = await verifyChatAccess(user.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logError("[ChatPage]", "Initialization failed", new Error(message));
    return <ErrorDisplay />;
  }

  return <ChatClient initialData={initialChats} conversationId={conversationId} />;
}
