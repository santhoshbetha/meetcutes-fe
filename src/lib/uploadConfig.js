export const UPLOAD_TIMEOUT_MS = 60_000;

/**
 * Creates an AbortSignal that aborts after the upload timeout, while still
 * honoring an optional caller-owned signal.
 */
export function createUploadSignal(externalSignal) {
  const controller = new AbortController();
  const timeout = window.setTimeout(
    () => controller.abort(),
    UPLOAD_TIMEOUT_MS,
  );

  const forwardAbort = () => controller.abort();

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener("abort", forwardAbort, { once: true });
    }
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      window.clearTimeout(timeout);
      externalSignal?.removeEventListener("abort", forwardAbort);
    },
  };
}
