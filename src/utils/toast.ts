// /home/nneessen/projects/commissionTracker/src/utils/toast.ts

import toast from "react-hot-toast";

interface ToastOptions {
  duration?: number;
}

/**
 * Toast notification utility
 * Wraps react-hot-toast with consistent styling and behavior
 */

export const showToast = {
  success: (message: string, options?: ToastOptions) => {
    toast.success(message, {
      duration: options?.duration ?? 4000,
      position: "top-right",
    });
  },

  error: (message: string, options?: ToastOptions) => {
    toast.error(message, {
      duration: options?.duration ?? 6000,
      position: "top-right",
    });
  },

  warning: (message: string, options?: ToastOptions) => {
    toast(message, {
      duration: options?.duration ?? 5000,
      position: "top-right",
      icon: "⚠️",
      style: {
        background: "#fef3c7",
        color: "#92400e",
        border: "1px solid #fcd34d",
      },
    });
  },

  info: (message: string, options?: ToastOptions) => {
    toast(message, {
      duration: options?.duration ?? 4000,
      position: "top-right",
      icon: "ℹ️",
    });
  },

  loading: (message: string) => {
    return toast.loading(message, {
      position: "top-right",
    });
  },

  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- error object type
      error: string | ((error: any) => string);
    },
  ) => {
    return toast.promise(promise, messages, {
      position: "top-right",
    });
  },

  dismiss: (toastId?: string) => {
    toast.dismiss(toastId);
  },
};

export default showToast;
