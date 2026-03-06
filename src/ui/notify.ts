/**
 * Notify Utility
 * Wraps ToastManager for consistent, branded notifications
 * 
 * Usage in screens:
 *   const toast = useToast();
 *   notifySuccess(toast, "Settings saved");
 *   notifyError(toast, "Something went wrong");
 *   notifyValidationError(toast); // standard message for form errors
 */

interface ToastInstance {
  show: (message: string, type?: "success" | "error" | "info") => void;
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
}

/**
 * Show a success toast
 */
export const notifySuccess = (toast: ToastInstance, message: string): void => {
  toast.showSuccess(message);
};

/**
 * Show an error toast
 */
export const notifyError = (toast: ToastInstance, message: string): void => {
  toast.showError(message);
};

/**
 * Show an info toast
 */
export const notifyInfo = (toast: ToastInstance, message: string): void => {
  toast.show(message, "info");
};

/**
 * Standard validation error toast
 * Use when form has inline errors and user attempts submit
 */
export const notifyValidationError = (toast: ToastInstance): void => {
  toast.showError("Please fix the highlighted fields.");
};

/**
 * Standard network error toast
 */
export const notifyNetworkError = (toast: ToastInstance): void => {
  toast.showError("Something went wrong. Please try again.");
};
