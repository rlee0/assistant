import { ChatClient } from "@/features/chat/components/chat-client";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { loadInitialChats } from "@/lib/supabase/loaders";
import { logError } from "@/lib/logging";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function ErrorDisplay() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <p className="text-sm text-red-600">Failed to load conversations.</p>
      <Link href="/" className="text-sm text-blue-600 underline underline-offset-4">
        Back home
      </Link>
    </div>
  );
}

export default async function ChatIndexPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    logError("[ChatIndexPage]", "Auth verification failed", error);
    redirect("/login");
  }

  if (!user) {
    redirect("/login");
  }

  let initialData;
  try {
    initialData = await loadInitialChats(user.id);

    // If there are chats, redirect to the first one
    if (initialData.order.length > 0) {
      redirect(`/chat/${initialData.order[0]}`);
    }
  } catch (err) {
    // Don't catch Next.js redirect errors - let them propagate
    if (err instanceof Error && err.message === "NEXT_REDIRECT") {
      throw err;
    }
    logError("[ChatIndexPage]", "Failed to load chats", err);
    return <ErrorDisplay />;
  }

  // Otherwise, show empty chat interface without an ID
  return <ChatClient initialData={initialData} />;
}
