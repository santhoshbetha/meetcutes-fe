import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createCheckoutSession,
  createPortalSession,
} from "@/services/billing.service";

/**
 * Starts Stripe Checkout and forwards the browser to the hosted page.
 */
export function useCheckoutSessionMutation() {
  return useMutation({
    mutationFn: createCheckoutSession,
    onSuccess: ({ url }) => {
      window.location.assign(url);
    },
    onError: (error) => {
      toast.error(
        error?.message || "Unable to start checkout. Please try again.",
      );
    },
  });
}

/**
 * Opens the Stripe Billing Portal for subscription and invoice management.
 */
export function usePortalSessionMutation() {
  return useMutation({
    mutationFn: createPortalSession,
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: (error) => {
      toast.error(
        error?.message || "Unable to open the billing portal. Please try again.",
      );
    },
  });
}
