import { redirect } from "next/navigation";

export default function RootPage() {
  // Redirect to chat home
  redirect("/chat");
}
