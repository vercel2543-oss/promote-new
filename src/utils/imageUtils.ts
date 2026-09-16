/**
 * Image processing and compression utilities for avatar and document uploads.
 * Resizes large photos from smartphones or cameras to standard web dimensions
 * to ensure instant saving and Firestore/localStorage quota safety.
 */

export async function compressAndResizeImage(
  input: File | string,
  maxWidth: number = 400,
  maxHeight: number = 400,
  quality: number = 0.82,
  preserveTransparency: boolean = false
): Promise<string> {
  return new Promise((resolve, reject) => {
    // If input is SVG file or svg data url, it's vector and lightweight
    if (typeof input === 'object' && input instanceof File && (input.type === 'image/svg+xml' || input.name.endsWith('.svg'))) {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(input);
      return;
    }
    if (typeof input === 'string' && input.startsWith('data:image/svg+xml')) {
      resolve(input);
      return;
    }

    const isPngOrWebp =
      (typeof input === 'object' && input instanceof File && (input.type === 'image/png' || input.type === 'image/webp')) ||
      (typeof input === 'string' && (input.startsWith('data:image/png') || input.startsWith('data:image/webp')));

    const shouldPreserveTransparency = preserveTransparency || isPngOrWebp;

    const processImg = (src: string) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(src);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        if (!shouldPreserveTransparency) {
          // Photos / Avatars: Use WebP or JPEG
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          
          let result = '';
          try {
            const webp = canvas.toDataURL('image/webp', quality);
            if (webp.startsWith('data:image/webp')) {
              result = webp;
            }
          } catch (e) {
            // fallback
          }
          if (!result) {
            result = canvas.toDataURL('image/jpeg', quality);
          }
          resolve(result);
        } else {
          // Transparent logos: Try WebP first (supports alpha and is tiny), fallback to PNG
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          let result = '';
          try {
            const webp = canvas.toDataURL('image/webp', quality);
            if (webp.startsWith('data:image/webp') && webp.length < 150 * 1024) {
              result = webp;
            }
          } catch (e) {
            // fallback
          }

          if (!result) {
            result = canvas.toDataURL('image/png');
            // If PNG is too large (> 120KB), try reducing quality with webp or jpeg
            if (result.length > 120 * 1024) {
              try {
                const webpUrl = canvas.toDataURL('image/webp', 0.8);
                if (webpUrl.startsWith('data:image/webp')) {
                  result = webpUrl;
                }
              } catch (e) {
                // fallback
              }
            }
          }
          resolve(result);
        }
      };

      img.onerror = () => {
        // Fallback to original string if error
        resolve(src);
      };

      img.src = src;
    };

    if (typeof input === 'string') {
      processImg(input);
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          processImg(reader.result);
        } else {
          reject(new Error('Failed to read image file'));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(input);
    }
  });
}

