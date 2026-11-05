import { createClient } from '@/lib/db/client';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_DIMENSION = 4096; // Max width or height to prevent canvas OOM

export async function convertToWebPBrowser(file: File, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const img = new window.Image();

      img.onload = () => {
        try {
          let { naturalWidth: w, naturalHeight: h } = img;

          if (w === 0 || h === 0) {
            reject(new Error('Image has zero dimensions.'));
            return;
          }

          // Downscale if either dimension exceeds the limit
          if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
            const ratio = Math.min(MAX_DIMENSION / w, MAX_DIMENSION / h);
            w = Math.round(w * ratio);
            h = Math.round(h * ratio);
          }

          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context.'));
            return;
          }
          ctx.drawImage(img, 0, 0, w, h);

          // Verify browser supports WebP export
          const testDataUrl = canvas.toDataURL('image/webp');
          if (!testDataUrl.startsWith('data:image/webp')) {
            reject(new Error('Browser does not support WebP export.'));
            return;
          }

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('WebP conversion produced no output.'));
                return;
              }
              resolve(blob);
            },
            'image/webp',
            quality
          );
        } catch (err) {
          reject(new Error(`Image processing failed: ${err instanceof Error ? err.message : 'Unknown error'}`));
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load image. The file may be corrupted or not a valid image.'));
      };

      img.src = reader.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read image file.'));
    };

    reader.readAsDataURL(file);
  });
}

export async function uploadPostImage(file: File, postId?: string): Promise<string> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds the 5MB limit.`);
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(`Invalid file type "${file.type}". Allowed: JPEG, PNG, WebP.`);
  }

  // Extract original name without extension
  const lastDot = file.name.lastIndexOf('.');
  const baseName = lastDot > 0 ? file.name.substring(0, lastDot) : file.name;
  // Sanitize: keep alphanumeric, hyphens, underscores, spaces (replace spaces with hyphens)
  const safeName = baseName
    .replace(/[^a-zA-Z0-9_\- ]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase() || 'image';

  let webpBlob: Blob;
  let convertedToWebP = false;
  try {
    webpBlob = await convertToWebPBrowser(file);
    convertedToWebP = true;
  } catch (err) {
    // If WebP conversion fails, upload the original file as-is
    console.warn('WebP conversion failed, uploading original:', err);
    webpBlob = file;
  }

  const originalExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const ext = convertedToWebP ? 'webp' : originalExt;
  const timestamp = Date.now();
  const filename = `${safeName}-${timestamp}.${ext}`;

  const db = createClient();

  let uploadError: { message: string } | null = null;
  try {
    const { error } = await db.storage
      .from('post-images')
      .upload(filename, webpBlob, {
        contentType: webpBlob.type || 'image/webp',
        upsert: false,
      });
    uploadError = error;
  } catch (err) {
    throw new Error(`Upload failed: Network error. Check your internet connection.`);
  }

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  const { data } = db.storage.from('post-images').getPublicUrl(filename);
  return data.publicUrl;
}

export async function deletePostImage(imageUrl: string): Promise<void> {
  const marker = '/post-images/';
  const index = imageUrl.indexOf(marker);
  if (index === -1) return;

  const path = decodeURIComponent(imageUrl.substring(index + marker.length));
  try {
    await createClient().storage.from('post-images').remove([path]);
  } catch {
    // Fail silently if image doesn't exist
  }
}
