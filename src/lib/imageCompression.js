export const MAX_OUTPUT_DIMENSION = 1600;
export const JPEG_QUALITY = 0.85;
export const MAX_OUTPUT_BYTES = 5 * 1024 * 1024;

const QUALITY_STEPS = [JPEG_QUALITY, 0.75, 0.65];

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not decode this image."));
    };
    image.src = url;
  });
}

function canvasToBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Could not encode this image."));
      },
      "image/jpeg",
      quality,
    );
  });
}

/**
 * Downscales and re-encodes a browser-selected image to a bounded JPEG.
 *
 * Canvas re-encoding strips EXIF/GPS metadata and keeps the upload well below
 * the server's 5 MB ceiling. The quality is stepped down only when the
 * dimension-capped output is still too large.
 */
export async function compressImageFile(
  file,
  {
    maxDimension = MAX_OUTPUT_DIMENSION,
    quality = JPEG_QUALITY,
    maxBytes = MAX_OUTPUT_BYTES,
  } = {},
) {
  if (!file) {
    throw new Error("No image file was provided.");
  }

  const image = await loadImage(file);
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const scale = Math.min(
    1,
    maxDimension / Math.max(sourceWidth, sourceHeight),
  );
  const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
  const targetHeight = Math.max(1, Math.round(sourceHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas is not available in this browser.");
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, targetWidth, targetHeight);

  let blob = null;
  for (const attempt of QUALITY_STEPS) {
    blob = await canvasToBlob(canvas, quality === JPEG_QUALITY ? attempt : quality);
    if (blob.size <= maxBytes) break;
  }

  if (!blob || blob.size > maxBytes) {
    throw new Error("Compressed image is still larger than 5 MB.");
  }

  const baseName = String(file.name || "profile-photo")
    .replace(/\.[^.]+$/, "")
    .slice(0, 80);

  return new File([blob], `${baseName}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

export default compressImageFile;
