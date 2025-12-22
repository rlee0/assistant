import Link from "next/link";
import { redirect } from "next/navigation";
import { ChatClient } from "@/components/chat-client";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export default async function Page() {
  let supabase;
  try {
    supabase = createSupabaseServerClient();
  } catch (error) {
    console.error(error);
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-sm text-red-600">
          Supabase auth is not configured. Set NEXT_PUBLIC_SUPABASE_URL and
          NEXT_PUBLIC_SUPABASE_ANON_KEY to continue.
        </p>
        <Link
          href="/login"
          className="text-sm text-blue-600 underline underline-offset-4"
        >
          Go to login
        </Link>
      </div>
    );
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  return <ChatClient />;
}
