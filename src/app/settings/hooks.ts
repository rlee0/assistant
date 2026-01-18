import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { logError } from "@/lib/logging";
import type { Settings } from "@/lib/settings/schema";
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "./constants";

interface UseLogoutReturn {
  logout: () => Promise<void>;
  isLoggingOut: boolean;
  error: string | null;
}

export function useLogout(): UseLogoutReturn {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    setIsLoggingOut(true);
    setError(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error("Logout request failed");
      }

      toast.success(SUCCESS_MESSAGES.LOGGED_OUT);
      router.push("/login");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }

      const errorMessage = err instanceof Error ? err.message : ERROR_MESSAGES.LOGOUT_FAILED;
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoggingOut(false);
      abortControllerRef.current = null;
    }
  }, [router]);

  return { logout, isLoggingOut, error };
}

interface UseDeleteAccountReturn {
  deleteAccount: () => Promise<void>;
  isDeleting: boolean;
  error: string | null;
}

export function useDeleteAccount(): UseDeleteAccountReturn {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const deleteAccount = useCallback(async (): Promise<void> => {
    setIsDeleting(true);
    setError(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error("Failed to delete account");
      }

      toast.success(SUCCESS_MESSAGES.ACCOUNT_DELETED);
      router.push("/login");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }

      const errorMessage =
        err instanceof Error ? err.message : ERROR_MESSAGES.DELETE_ACCOUNT_FAILED;
      setError(errorMessage);
      toast.error(errorMessage);
      setIsDeleting(false);
    } finally {
      abortControllerRef.current = null;
    }
  }, [router]);

  return { deleteAccount, isDeleting, error };
}

interface UsePasswordFormReturn {
  currentPassword: string;
  setCurrentPassword: (value: string) => void;
  newPassword: string;
  setNewPassword: (value: string) => void;
  confirmPassword: string;
  setConfirmPassword: (value: string) => void;
  resetForm: () => void;
}

export function usePasswordForm(): UsePasswordFormReturn {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const resetForm = useCallback(() => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }, []);

  return {
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    resetForm,
  };
}

interface UseThemeChangeReturn {
  handleThemeChange: (value: string) => void;
}

export function useThemeChange(
  updateSettings: (partial: Partial<Settings>) => void
): UseThemeChangeReturn {
  const handleThemeChange = useCallback(
    (value: string) => {
      if (value !== "light" && value !== "dark" && value !== "system") {
        logError("Settings", "Invalid theme value", new Error(`Received: ${value}`));
        return;
      }

      updateSettings({
        appearance: { theme: value },
      });
    },
    [updateSettings]
  );

  return { handleThemeChange };
}
