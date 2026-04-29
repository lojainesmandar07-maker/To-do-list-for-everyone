import { useState, useEffect } from 'react';
import localforage from 'localforage';

export function useLocalForage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);

  useEffect(() => {
    localforage.getItem<T>(key).then((storedValue) => {
      if (storedValue !== null) {
        setValue(storedValue);
      } else {
        // Fallback migration from localStorage
        const old = localStorage.getItem(key);
        if (old) {
          try {
            const parsed = JSON.parse(old);
            setValue(parsed);
          } catch {
            // Assume string if JSON parse fails
            if (!old.startsWith('blob:')) {
              setValue(old as any);
            }
          }
        }
      }
    }).catch(e => console.error('LocalForage load error:', e));
  }, [key]);

  const setValueAndSave = (newValue: T | ((curr: T) => T)) => {
    setValue((prev) => {
      const next = typeof newValue === 'function' ? (newValue as Function)(prev) : newValue;
      localforage.setItem(key, next).catch(e => console.error('LocalForage save error:', e));
      return next;
    });
  };

  return [value, setValueAndSave] as const;
}

export const fileToBase64 = (file: File, maxWidth = 800, maxHeight = 800): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(reader.result as string);
        }

        const resizeAndEncode = (w: number, h: number): string => {
          canvas.width = w;
          canvas.height = h;
          ctx.clearRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          return canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/webp', 0.8);
        };

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = width * ratio;
          height = height * ratio;
        }

        let dataUrl = resizeAndEncode(width, height);
        
        // Firestore limit is ~1MB (1,000,000 chars roughly to be safe)
        // If PNG is too large (since quality param does not apply to PNG), scale down further
        while (dataUrl.length > 950000 && width > 100) {
          width = width * 0.8;
          height = height * 0.8;
          dataUrl = resizeAndEncode(width, height);
        }
        
        resolve(dataUrl);
      };
      img.onerror = () => resolve(reader.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
