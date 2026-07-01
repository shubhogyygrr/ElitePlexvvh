import { useState, useEffect } from 'react';

/**
 * Advanced IndexedDB local storage engine for media files (images & videos).
 * Bypasses Firestore's 1MB document limit and localStorage's 5MB limit.
 * Stores raw Blobs directly, enabling seamless offline play and real downloads.
 */

const DB_NAME = 'cinema_local_storage';
const DB_VERSION = 2;
const STORE_NAME = 'media_files';

export interface LocalMediaFile {
  id: string;
  blob: Blob;
  filename: string;
  mimeType: string;
  size: number;
  uploadedAt: number;
}

export interface PlaybackProgress {
  id: string;
  timestamp: number;
  updatedAt: number;
}

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    try {
      if (!window || !window.indexedDB) {
        reject(new Error('IndexedDB is not supported in this environment'));
        return;
      }
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('IndexedDB opening failed');
        reject(request.error || new Error('Unknown IndexedDB error'));
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('playback_progress')) {
          db.createObjectStore('playback_progress', { keyPath: 'id' });
        }
      };
    } catch (e) {
      console.warn('IndexedDB initialization threw security or environment error:', e);
      reject(e instanceof Error ? e : new Error(String(e)));
    }
  });
}

/**
 * Saves the playback progress of a downloaded movie/episode in IndexedDB.
 */
export async function savePlaybackProgress(id: string, timestamp: number): Promise<void> {
  try {
    const db = await getDB();
    const record: PlaybackProgress = {
      id,
      timestamp,
      updatedAt: Date.now()
    };
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('playback_progress', 'readwrite');
      const store = transaction.objectStore('playback_progress');
      const request = store.put(record);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('savePlaybackProgress failed:', error);
  }
}

/**
 * Retrieves the saved playback progress of a downloaded movie/episode from IndexedDB.
 */
export async function getPlaybackProgress(id: string): Promise<number> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('playback_progress', 'readonly');
      const store = transaction.objectStore('playback_progress');
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result ? request.result.timestamp : 0);
      };
      request.onerror = () => {
        resolve(0);
      };
    });
  } catch (error) {
    console.error('getPlaybackProgress failed:', error);
    return 0;
  }
}

/**
 * Saves a local File/Blob to IndexedDB storage
 * @returns An internal reference string starting with idb://
 */
export async function saveLocalFile(file: File | Blob, customFilename?: string): Promise<string> {
  try {
    const db = await getDB();
    const id = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const filename = customFilename || (file as File).name || 'local_media_source';
    const mimeType = file.type || 'video/mp4';
    const size = file.size;

    const record: LocalMediaFile = {
      id,
      blob: file,
      filename,
      mimeType,
      size,
      uploadedAt: Date.now()
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(record);

      request.onsuccess = () => {
        resolve(`idb://${id}`);
      };

      request.onerror = () => {
        console.error('Failed to add file to IndexedDB store:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('saveLocalFile failed:', error);
    // Fallback: create temporary ObjectURL (won't persist across reloads, but avoids crashing)
    const tempUrl = URL.createObjectURL(file);
    return tempUrl;
  }
}

/**
 * Retrieves a saved File/Blob record from IndexedDB by its idb:// reference
 */
export async function getLocalFile(referenceUrl: string): Promise<LocalMediaFile | null> {
  if (!referenceUrl || !referenceUrl.startsWith('idb://')) {
    return null;
  }

  const id = referenceUrl.replace('idb://', '');

  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        console.error('Failed to get file from IndexedDB:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('getLocalFile failed:', error);
    return null;
  }
}

/**
 * Resolves any media URL. If it's an idb:// reference, returns a temporary Object URL.
 * Otherwise, returns the URL as-is.
 */
const resolvedUrlsCache = new Map<string, string>();

export async function resolveMediaUrl(url: string): Promise<string> {
  if (!url) return '';
  if (!url.startsWith('idb://')) return url;

  // Check cache to avoid creating multiple Object URLs for the same reference
  if (resolvedUrlsCache.has(url)) {
    return resolvedUrlsCache.get(url)!;
  }

  const record = await getLocalFile(url);
  if (record && record.blob) {
    const objectUrl = URL.createObjectURL(record.blob);
    resolvedUrlsCache.set(url, objectUrl);
    return objectUrl;
  }

  return '';
}

/**
 * Format raw file size in bytes to human readable format (MB/GB)
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * React Hook that resolves any media URL.
 * If it is an idb:// reference, asynchronously loads the blob and returns a temporary Object URL.
 * Otherwise, returns the original URL.
 */
export function useResolvedUrl(url: string | undefined): string {
  const [resolvedUrl, setResolvedUrl] = useState<string>('');

  useEffect(() => {
    if (!url) {
      setResolvedUrl('');
      return;
    }
    
    let isMounted = true;
    resolveMediaUrl(url).then((resolved) => {
      if (isMounted) {
        setResolvedUrl(resolved);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [url]);

  return resolvedUrl || url || '';
}

/**
 * Triggers a real browser download of a video file or image.
 * Supports IndexedDB references, base64 data URLs, and remote URLs.
 */
export async function triggerRealFileDownload(url: string, defaultFilename: string): Promise<void> {
  if (!url) return;

  if (url.startsWith('idb://')) {
    const record = await getLocalFile(url);
    if (record && record.blob) {
      const downloadUrl = URL.createObjectURL(record.blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = record.filename || defaultFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
      return;
    }
  }

  if (url.startsWith('data:')) {
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }

  // Remote URL
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const downloadUrl = URL.createObjectURL(blob);
    
    // Extract filename from URL
    const urlParts = url.split('/');
    const lastPart = urlParts[urlParts.length - 1] || '';
    const cleanFilename = lastPart.includes('.') ? lastPart.split('?')[0] : defaultFilename;

    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = cleanFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
  } catch (error) {
    console.warn('CORS direct fetch download failed, falling back to standard link opening:', error);
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.download = defaultFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}


