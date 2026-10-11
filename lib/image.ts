// Phone cameras produce 4 to 12MB photos. Claude caps images at 5MB and reads
// receipts perfectly well at ~1600px, so shrink and re-encode before upload.
// This also makes scanning noticeably faster on patchy overseas data.

export interface CompressedImage {
  blob: Blob;
  base64: string;
  mimeType: 'image/jpeg';
  previewUrl: string;
}

export async function compressImage(file: File, maxEdge = 1600, quality = 0.82): Promise<CompressedImage> {
  const bitmap = await loadBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not supported on this device');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  if ('close' in bitmap) bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not process image'))), 'image/jpeg', quality)
  );

  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

  return { blob, base64, mimeType: 'image/jpeg', previewUrl: URL.createObjectURL(blob) };
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try {
      // Respects EXIF rotation so sideways phone photos come out upright.
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      // Some browsers reject the options bag, fall through to <img>.
    }
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('That file is not an image we can read'));
    img.src = URL.createObjectURL(file);
  });
}
