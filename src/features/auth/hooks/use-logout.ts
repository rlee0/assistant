import { useCallback, useEffect, useRef, useState } from "react";

import { API_ROUTES } from "@/lib/api/routes";
import { toast } from "sonner";
import { useChatStore } from "@/features/chat/store/chat-store";
import { useRouter } from "next/navigation";
import { useSettingsStore } from "@/features/settings/store/settings-store";

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
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const logout = useCallback(async () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(API_ROUTES.AUTH.LOGOUT, {
        method: "POST",
        credentials: "include",
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Logout failed");
      }

      toast.success("Logged out successfully");

      resetChatStore();
      resetSettingsStore();

      router.replace("/login");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }

      const message = err instanceof Error ? err.message : "An error occurred during logout";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [router, resetChatStore, resetSettingsStore]);

  return { logout, isLoading, error };
}
