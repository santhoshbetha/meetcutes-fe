import { api } from "@/lib/api";
import { validateProfileImage } from "@/lib/imageValidation";
import { createUploadSignal } from "@/lib/uploadConfig";
import { unwrapProfile } from "@/services/profile.service";

export const MAX_PROFILE_IMAGES = 10;

function imageResult(payload) {
  return {
    success: true,
    profile: unwrapProfile(payload),
    data: payload?.data ?? null,
  };
}

/**
 * Uploads a profile photo into a 0-based slot (`0`..`9`).
 *
 * The backend validates the file's magic bytes before storing it, so callers
 * only need to pass the cropped `File`/`Blob` and the slot index.
 */
export async function uploadImage(file, slot, { signal } = {}) {
  // Final defense-in-depth guard: no caller can reach the network with a file
  // that violates the size or MIME whitelist.
  validateProfileImage(file);

  const form = new FormData();
  form.append("slot", String(slot));
  form.append("file", file, file?.name || "profile-photo.jpg");

  const { signal: timeoutSignal, cleanup } = createUploadSignal(signal);

  try {
    const payload = await api.post(
      "/api/v1/profiles/me/images",
      form,
      { signal: timeoutSignal },
    );
    return imageResult(payload);
  } finally {
    cleanup();
  }
}

/**
 * Clears a 0-based photo slot and deletes the stored file.
 */
export async function deleteImage(slot, { signal } = {}) {
  const payload = await api.delete(
    `/api/v1/profiles/me/images/${encodeURIComponent(String(slot))}`,
    { signal },
  );

  return imageResult(payload);
}

/**
 * Reorders the user's existing photos without re-uploading them.
 *
 * `slots` is a sparse list of storage filenames; empty strings mark unused
 * slots. The backend rejects filenames the account does not own.
 */
export async function reorderImages(slots, { signal } = {}) {
  const images = Array.from(
    { length: MAX_PROFILE_IMAGES },
    (_, index) => slots?.[index] || "",
  );

  const payload = await api.put(
    "/api/v1/profiles/me/images",
    { images },
    { signal },
  );

  return imageResult(payload);
}
