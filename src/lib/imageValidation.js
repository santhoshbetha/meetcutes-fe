export const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_PROFILE_IMAGE_LABEL = "5MB";
export const ALLOWED_PROFILE_IMAGE_TYPES = Object.freeze([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

/**
 * Typed validation failure so callers can distinguish a rejected file from a
 * transport/API error without parsing message strings.
 */
export class ImageValidationError extends Error {
  constructor(message, code = "invalid_image") {
    super(message);
    this.name = "ImageValidationError";
    this.code = code;
  }
}

/**
 * Single source of truth for photo upload guardrails.
 *
 * The whitelist is intentionally MIME-based: the browser-provided extension is
 * not trusted, and the cropper always re-encodes to `image/jpeg`.
 */
export function validateProfileImage(
  file,
  {
    maxSize = MAX_PROFILE_IMAGE_BYTES,
    allowedTypes = ALLOWED_PROFILE_IMAGE_TYPES,
  } = {},
) {
  if (!file) {
    throw new ImageValidationError(
      "No image file was provided.",
      "missing_file",
    );
  }

  const type = String(file.type || "").toLowerCase();
  if (!allowedTypes.includes(type)) {
    throw new ImageValidationError(
      "Invalid file type. Only JPEG, PNG, and WebP images are allowed.",
      "invalid_type",
    );
  }

  const size = Number(file.size ?? 0);
  if (size > maxSize) {
    throw new ImageValidationError(
      `File too large. Maximum size allowed is ${MAX_PROFILE_IMAGE_LABEL}.`,
      "too_large",
    );
  }

  return true;
}
