/**
 * Client-side image resize helper.
 *
 * Vercel's serverless body-size limit (~4.5 MB) is lower than what photos
 * straight off a phone produce. We resize on the client to fit within
 * MAX_DIM × MAX_DIM at QUALITY before uploading. Skips resizing when the
 * source is already small enough.
 */

export type ResizeOpts = {
  maxDim?: number;
  quality?: number;
  mime?: "image/jpeg" | "image/webp" | "image/png";
};

export async function resizeImage(file: File, opts: ResizeOpts = {}): Promise<File> {
  const maxDim = opts.maxDim ?? 1920;
  const quality = opts.quality ?? 0.85;
  const mime = opts.mime ?? (file.type === "image/png" ? "image/png" : "image/jpeg");

  // Tiny files: skip the resize round trip.
  if (file.size < 600_000) return file;

  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;

  let targetW = width;
  let targetH = height;
  if (width > maxDim || height > maxDim) {
    const ratio = Math.min(maxDim / width, maxDim / height);
    targetW = Math.round(width * ratio);
    targetH = Math.round(height * ratio);
  }

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close?.();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, targetW, targetH);
  bitmap.close?.();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), mime, quality)
  );
  if (!blob) return file;

  const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${baseName}.${ext}`, { type: mime, lastModified: Date.now() });
}
