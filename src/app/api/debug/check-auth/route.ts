import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export async function GET() {
  const supabase = await createSupabaseServerClient({ allowCookieWrite: true });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 200 });
  }

  // Test 1: Check what data this user can see with explicit filter
  const { data: myChats, error: myChatsError } = await supabase
    .from("chats")
    .select("id,title,user_id")
    .eq("user_id", user.id);

  // Test 2: Check what RLS allows without explicit filter
  const { data: rlsChats, error: rlsChatsError } = await supabase
    .from("chats")
    .select("id,title,user_id");

  // Test 3: Check messages
  const { data: myMessages, error: myMessagesError } = await supabase
    .from("messages")
    .select("id,chat_id,user_id,role,content")
    .eq("user_id", user.id)
    .limit(5);

  const { data: rlsMessages, error: rlsMessagesError } = await supabase
    .from("messages")
    .select("id,chat_id,user_id,role,content")
    .limit(5);

  return NextResponse.json({
    authenticated: true,
    currentUser: {
      id: user.id,
      email: user.email,
    },
    tests: {
      myChats: {
        count: myChats?.length || 0,
        data: myChats,
        error: myChatsError?.message,
      },
      rlsChats: {
        count: rlsChats?.length || 0,
        data: rlsChats,
        error: rlsChatsError?.message,
        message: "RLS should limit this to same count as myChats",
      },
      myMessages: {
        count: myMessages?.length || 0,
        data: myMessages?.map((m) => ({
          id: m.id,
          user_id: m.user_id,
          content: m.content?.substring(0, 50),
        })),
        error: myMessagesError?.message,
      },
      rlsMessages: {
        count: rlsMessages?.length || 0,
        data: rlsMessages?.map((m) => ({
          id: m.id,
          user_id: m.user_id,
          content: m.content?.substring(0, 50),
        })),
        error: rlsMessagesError?.message,
        message: "RLS should limit this to same count as myMessages",
      },
    },
    analysis: {
      rlsWorking:
        myChats?.length === rlsChats?.length && myMessages?.length === rlsMessages?.length,
      explanation:
        myChats?.length === rlsChats?.length
          ? "RLS is working correctly"
          : `RLS BREACH: User can see ${rlsChats?.length} chats but should only see ${myChats?.length}`,
    },
  });
}
