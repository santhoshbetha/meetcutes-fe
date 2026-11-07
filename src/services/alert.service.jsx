import { toast } from "sonner";

export const alertService = {
  successAlert,
  errorAlert,
  infoAlert,
  warn,
};

export const alertType = {
  success: "success",
  error: "error",
  info: "info",
  warning: "warning",
};

// convenience methods

export function errorAlert(title, message) {
  //alert({ type: alertType.error, message, title });
  toast.error(message);
}

export function successAlert(title, message) {
  //alert({ type: alertType.success, message, title });
  toast.success(message);
}

export function infoAlert(title, message) {
  //alert({ type: alertType.info, message, title });
  toast(message);
}

export function warn(title, message) {
  //alert({ ...options, type: alertType.warning, message, title });
  toast(message, {
    icon: '⚠️',
  });
}

// core alert method (not used)
