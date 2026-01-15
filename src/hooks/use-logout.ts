import { API_ROUTES } from "@/lib/api/routes";
import { toast } from "sonner";
import { useChatStore } from "@/store/chat-store";
import { useRouter } from "next/navigation";
import { useSettingsStore } from "@/store/settings-store";
import { useState } from "react";

/**
 * Hook for handling user logout
 *
 * Provides logout functionality with error handling and user feedback.
 * Redirects to login page on successful logout.
 * Properly handles request cancellation on component unmount.
 *
 * @returns Object with logout function, loading state, and error state
 *
 * @example
 * const { logout, isLoading, error } = useLogout();
 *
 * const handleLogout = async () => {
 *   await logout();
 * };
 */
export function useLogout() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resetChatStore = useChatStore((state) => state.reset);
  const resetSettingsStore = useSettingsStore((state) => state.reset);

  async function logout() {
    const controller = new AbortController();

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(API_ROUTES.AUTH.LOGOUT, {
        method: "POST",
        credentials: "include",
        signal: controller.signal,
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Logout failed");
      }

      toast.success("Logged out successfully");

      // Clear all stores to prevent showing other users' data
      resetChatStore();
      resetSettingsStore();

      // Redirect to login page
      router.replace("/login");
    } catch (err) {
      // Handle abort gracefully (component unmounted during request)
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }

      const message = err instanceof Error ? err.message : "An error occurred during logout";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  return { logout, isLoading, error };
}
