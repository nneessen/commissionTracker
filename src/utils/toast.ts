// /home/nneessen/projects/commissionTracker/src/utils/toast.ts

import toast from 'react-hot-toast';

/**
 * Toast notification utility
 * Wraps react-hot-toast with consistent styling and behavior
 */

export const showToast = {
  success: (message: string) => {
    toast.success(message, {
      duration: 4000,
      position: 'top-right',
    });
  },

  error: (message: string) => {
    toast.error(message, {
      duration: 6000,
      position: 'top-right',
    });
  },

  loading: (message: string) => {
    return toast.loading(message, {
      position: 'top-right',
    });
  },

  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    }
  ) => {
    return toast.promise(
      promise,
      messages,
      {
        position: 'top-right',
      }
    );
  },

  dismiss: (toastId?: string) => {
    toast.dismiss(toastId);
  },
};

export default showToast;
