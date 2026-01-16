import { ChatClient } from "@/features/chat/components/chat-client";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { loadInitialChats } from "@/lib/supabase/loaders";
import { logError } from "@/lib/logging";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Page() {
  let initialChats;

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      logError("[Page]", "Auth verification failed", error);
      redirect("/login");
    }

    if (!user) {
      redirect("/login");
    }

    initialChats = await loadInitialChats(user.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logError("[Page]", "Initialization failed", new Error(message));

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-sm text-red-600">
          Authentication service is not configured. Set NEXT_PUBLIC_SUPABASE_URL and
          NEXT_PUBLIC_SUPABASE_ANON_KEY to continue.
        </p>
        <Link href="/login" className="text-sm text-blue-600 underline underline-offset-4">
          Go to login
        </Link>
      </div>
    );
  }

  return <ChatClient initialData={initialChats} />;
}
