import { toast } from "sonner";
import { useCallback } from "react";

export type LoadingToastId = string | number;

type ToastType = "success" | "error" | "info" | "loading";

interface UseLoadingToastResult {
  showLoading: (message: string) => LoadingToastId;
  success: (id: LoadingToastId, message: string, duration?: number) => void;
  error: (id: LoadingToastId, message: string, duration?: number) => void;
  dismiss: (id: LoadingToastId) => void;
  info: (id: LoadingToastId, message: string, duration?: number) => void;
}

interface AsyncToastOptions {
  loadingMessage?: string;
  successMessage?: string;
  errorMessage?: string;
  duration?: number;
}

export function useLoadingToast(): UseLoadingToastResult {
  const showLoading = useCallback((message: string): LoadingToastId => {
    if (!message || typeof message !== "string") {
      throw new Error("Message must be a non-empty string");
    }
    return toast.loading(message);
  }, []);

  const updateToast = useCallback(
    (id: LoadingToastId, toastType: ToastType, message: string, duration: number) => {
      switch (toastType) {
        case "success":
          toast.success(message, { id, duration });
          break;
        case "error":
          toast.error(message, { id, duration });
          break;
        case "info":
          toast.info(message, { id, duration });
          break;
        case "loading":
          toast.loading(message, { id });
          break;
      }
    },
    []
  );

  const success = useCallback(
    (id: LoadingToastId, message: string, duration = 2000) => {
      updateToast(id, "success", message, duration);
    },
    [updateToast]
  );

  const error = useCallback(
    (id: LoadingToastId, message: string, duration = 2000) => {
      updateToast(id, "error", message, duration);
    },
    [updateToast]
  );

  const info = useCallback(
    (id: LoadingToastId, message: string, duration = 2000) => {
      updateToast(id, "info", message, duration);
    },
    [updateToast]
  );

  const dismiss = useCallback((id: LoadingToastId) => {
    toast.dismiss(id);
  }, []);

  return {
    showLoading,
    success,
    error,
    dismiss,
    info,
  };
}

interface UseAsyncToastResult<T = unknown> {
  executeWithToast: (asyncFn: () => Promise<T>, options?: AsyncToastOptions) => Promise<T | null>;
  showLoading: (message: string) => LoadingToastId;
  success: (id: LoadingToastId, message: string, duration?: number) => void;
  error: (id: LoadingToastId, message: string, duration?: number) => void;
  dismiss: (id: LoadingToastId) => void;
}

export function useAsyncToast(): UseAsyncToastResult {
  const { showLoading, success, error, dismiss } = useLoadingToast();

  const executeWithToast = useCallback(
    async <T>(asyncFn: () => Promise<T>, options: AsyncToastOptions = {}): Promise<T | null> => {
      if (!asyncFn || typeof asyncFn !== "function") {
        throw new Error("asyncFn must be a function");
      }

      const {
        loadingMessage = "Loading...",
        successMessage = "Success!",
        errorMessage = "Something went wrong",
        duration = 2000,
      } = options;

      const toastId = showLoading(loadingMessage);

      try {
        const result = await asyncFn();
        success(toastId, successMessage, duration);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : errorMessage;
        error(toastId, message, duration);
        return null;
      }
    },
    [showLoading, success, error]
  );

  return { executeWithToast, showLoading, success, error, dismiss };
}
