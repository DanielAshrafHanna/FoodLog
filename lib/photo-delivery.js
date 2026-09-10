export const THUMB_MAX_DIMENSION = 480;
export const THUMB_QUALITY = 0.78;
export const ORIGINAL_MAX_DIMENSION = 1200;
export const ORIGINAL_QUALITY = 0.8;

export function siblingThumbPath(photoPath) {
  const value = String(photoPath ?? "").trim();
  if (!value) return "";
  const slash = value.lastIndexOf("/");
  const fileName = slash >= 0 ? value.slice(slash + 1) : value;
  const directory = slash >= 0 ? value.slice(0, slash + 1) : "";
  const dot = fileName.lastIndexOf(".");
  const base = dot > 0 ? fileName.slice(0, dot) : fileName;
  if (base.endsWith("-thumb")) return value;
  return `${directory}${base}-thumb.jpg`;
}

export function reservedPhotoPath(userId, photoId, kind = "dish") {
  const owner = String(userId ?? "").trim();
  const id = String(photoId ?? "").trim();
  if (!owner || !id) return { path: "", thumbPath: "" };
  const path = kind === "restaurant" ? `${owner}/restaurants/${id}.jpg` : `${owner}/${id}.jpg`;
  return { path, thumbPath: siblingThumbPath(path) };
}

export function displayPhotoSrc(photo, size = "thumb") {
  if (!photo) return "";
  if (size === "full") return photo.photo || photo.thumb || "";
  return photo.thumb || photo.photo || "";
}

export function photoSrcSet(photo) {
  if (!photo?.photo) return "";
  if (!photo.thumb || photo.thumb === photo.photo) return "";
  return `${photo.thumb} 480w, ${photo.photo} 1200w`;
}

export function isMissingColumnError(error) {
  const message = String(error?.message ?? error ?? "").toLowerCase();
  return message.includes("thumb_path") && (message.includes("does not exist") || message.includes("schema cache"));
}

export function isDuplicateObjectError(error) {
  const message = String(error?.message ?? error ?? "").toLowerCase();
  const status = String(error?.statusCode ?? error?.status ?? "");
  return status === "409" || status === "409 Conflict" || message.includes("already exists") || message.includes("duplicate");
}

function scaleToMax(width, height, maxDimension) {
  if (!width || !height || (width <= maxDimension && height <= maxDimension)) {
    return { width, height };
  }
  if (width > height) {
    return { width: maxDimension, height: Math.round((height * maxDimension) / width) };
  }
  return { width: Math.round((width * maxDimension) / height), height: maxDimension };
}

function blobToJpegFile(blob, originalName) {
  const baseName = String(originalName ?? "photo");
  const trimmed = baseName.includes(".") ? baseName.slice(0, baseName.lastIndexOf(".")) : baseName;
  return new File([blob], `${trimmed}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
}

async function canvasFromBitmap(bitmap, width, height, quality) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  return blob;
}

export async function compressImage(file, maxDimension = ORIGINAL_MAX_DIMENSION, quality = ORIGINAL_QUALITY) {
  if (!file || !(file.type || "").startsWith("image/")) return file;
  const dimension = Number(maxDimension) || ORIGINAL_MAX_DIMENSION;
  const jpegQuality = Number(quality) || ORIGINAL_QUALITY;

  if (typeof createImageBitmap === "function") {
    try {
      const original = await createImageBitmap(file);
      const { width, height } = scaleToMax(original.width, original.height, dimension);
      let bitmap = original;
      if (width !== original.width || height !== original.height) {
        original.close?.();
        bitmap = await createImageBitmap(file, {
          resizeWidth: width,
          resizeHeight: height,
          resizeQuality: "high"
        });
      }
      const blob = await canvasFromBitmap(bitmap, width, height, jpegQuality);
      bitmap.close?.();
      if (!blob) return file;
      return blobToJpegFile(blob, file.name);
    } catch {
      // Fall through to the Image() decoder used before this optimization.
    }
  }

  return new Promise((resolve) => {
    const image = new Image();
    image.src = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(image.src);
      const { width, height } = scaleToMax(image.width, image.height, dimension);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(image, 0, 0, width, height);
      canvas.toBlob((blob) => {
        resolve(blob ? blobToJpegFile(blob, file.name) : file);
      }, "image/jpeg", jpegQuality);
    };
    image.onerror = () => {
      URL.revokeObjectURL(image.src);
      resolve(file);
    };
  });
}

export async function mapPool(items, limit, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}
