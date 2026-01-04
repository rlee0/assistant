import { ChatClient } from "@/components/chat-client";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { loadInitialChats } from "@/lib/supabase/loaders";
import { redirect } from "next/navigation";

export default async function Page() {
  let supabase;
  try {
    supabase = await createSupabaseServerClient();
  } catch (error) {
    console.error(error);
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-sm text-red-600">
          Supabase auth is not configured. Set NEXT_PUBLIC_SUPABASE_URL and
          NEXT_PUBLIC_SUPABASE_ANON_KEY to continue.
        </p>
        <Link href="/signup" className="text-sm text-blue-600 underline underline-offset-4">
          Go to sign up
        </Link>
      </div>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signup");
  }

  const initialChats = await loadInitialChats(user.id);

  return <ChatClient />;
}
