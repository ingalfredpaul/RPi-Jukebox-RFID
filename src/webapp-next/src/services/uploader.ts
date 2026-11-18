import { create } from 'zustand';
import { API_HEADERS, joinPath } from './files';
import { UPLOAD_EXTENSIONS } from '../config';
import { generateId } from '../utils/uuid';

/**
 * Sequential upload queue.
 *
 * - one file at a time: the Pi Zero 2 W only has 415 MB RAM and a slow SD card,
 *   parallel uploads would only make everything slower and less robust
 * - per-file and total progress (XHR upload events; fetch cannot report upload progress)
 * - cancel / retry per file, one automatic retry for network hiccups
 * - Wake Lock API (where the browser has it) keeps the screen on during the upload,
 *   because a locked phone suspends the page and with it the transfer
 */

export type UploadStatus = 'queued' | 'uploading' | 'done' | 'error' | 'canceled';

export interface UploadItem {
  id: string;
  name: string;
  /** Target path relative to the audio root (includes the file name). */
  path: string;
  size: number;
  loaded: number;
  status: UploadStatus;
  error?: string;
  replaced?: boolean;
  attempts: number;
}

export interface SkippedFile {
  name: string;
  reason: 'extension' | 'hidden' | 'too-big' | 'empty';
}

interface PendingFile {
  file: File;
}

interface UploadState {
  items: UploadItem[];
  skipped: SkippedFile[];
  maxBytes: number | null;
  wakeLock: 'none' | 'active' | 'unsupported';
  setMaxBytes: (n: number | null) => void;
  addFiles: (files: File[], targetDir: string, subFolder?: string) => void;
  cancel: (id: string) => void;
  cancelAll: () => void;
  retry: (id: string) => void;
  retryFailed: () => void;
  clearFinished: () => void;
  clearSkipped: () => void;
}

const pending = new Map<string, PendingFile>();
let currentXhr: XMLHttpRequest | null = null;
let running = false;
let wakeSentinel: WakeLockSentinel | null = null;
const MAX_AUTO_RETRIES = 1;

export function extensionOf(name: string): string {
  const i = name.lastIndexOf('.');
  return i < 0 ? '' : name.slice(i + 1).toLowerCase();
}

export function isAllowedName(name: string): boolean {
  return (UPLOAD_EXTENSIONS as readonly string[]).includes(extensionOf(name));
}

/** Relative path of a picked file: folder uploads carry `webkitRelativePath`. */
export function relativePathOf(file: File): string {
  const rel = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
  return rel && rel.length > 0 ? rel : file.name;
}

export const useUploadStore = create<UploadState>((set, get) => ({
  items: [],
  skipped: [],
  maxBytes: null,
  wakeLock: 'none',

  setMaxBytes: (n) => set({ maxBytes: n }),

  addFiles: (files, targetDir, subFolder = '') => {
    const skipped: SkippedFile[] = [];
    const added: UploadItem[] = [];
    const maxBytes = get().maxBytes;

    for (const file of files) {
      const rel = relativePathOf(file);
      const segments = rel.split('/');
      if (segments.some((s) => s.startsWith('.'))) {
        skipped.push({ name: rel, reason: 'hidden' });
      } else if (!isAllowedName(file.name)) {
        skipped.push({ name: rel, reason: 'extension' });
      } else if (file.size === 0) {
        skipped.push({ name: rel, reason: 'empty' });
      } else if (maxBytes !== null && file.size > maxBytes) {
        skipped.push({ name: rel, reason: 'too-big' });
      } else {
        const id = generateId();
        pending.set(id, { file });
        added.push({
          id,
          name: rel,
          path: joinPath(targetDir, subFolder, rel),
          size: file.size,
          loaded: 0,
          status: 'queued',
          attempts: 0,
        });
      }
    }

    // Natural order so "Kapitel 2" is uploaded before "Kapitel 10".
    added.sort((a, b) => a.path.localeCompare(b.path, 'de', { numeric: true }));
    set((s) => ({ items: [...s.items, ...added], skipped: [...s.skipped, ...skipped] }));
    void runQueue();
  },

  cancel: (id) => {
    const item = get().items.find((i) => i.id === id);
    if (!item) return;
    if (item.status === 'uploading') {
      currentXhr?.abort(); // handled in uploadOne -> status canceled
    } else if (item.status === 'queued') {
      patch(id, { status: 'canceled' });
      pending.delete(id);
    }
  },

  cancelAll: () => {
    for (const item of get().items) {
      if (item.status === 'queued') {
        patch(item.id, { status: 'canceled' });
        pending.delete(item.id);
      }
    }
    currentXhr?.abort();
  },

  retry: (id) => {
    if (!pending.has(id)) return;
    patch(id, { status: 'queued', error: undefined, loaded: 0, attempts: 0 });
    void runQueue();
  },

  retryFailed: () => {
    for (const item of get().items) {
      if ((item.status === 'error' || item.status === 'canceled') && pending.has(item.id)) {
        patch(item.id, { status: 'queued', error: undefined, loaded: 0, attempts: 0 });
      }
    }
    void runQueue();
  },

  clearFinished: () => {
    set((s) => {
      const keep = s.items.filter((i) => i.status === 'queued' || i.status === 'uploading' || i.status === 'error');
      const keepIds = new Set(keep.map((i) => i.id));
      for (const id of [...pending.keys()]) if (!keepIds.has(id)) pending.delete(id);
      return { items: keep };
    });
  },

  clearSkipped: () => set({ skipped: [] }),
}));

function patch(id: string, changes: Partial<UploadItem>) {
  useUploadStore.setState((s) => ({
    items: s.items.map((i) => (i.id === id ? { ...i, ...changes } : i)),
  }));
}

/** Total progress 0..1 over all files that were not canceled. */
export function totalProgress(items: UploadItem[]): number {
  const relevant = items.filter((i) => i.status !== 'canceled');
  const total = relevant.reduce((sum, i) => sum + i.size, 0);
  if (total === 0) return 0;
  const done = relevant.reduce((sum, i) => sum + (i.status === 'done' ? i.size : i.loaded), 0);
  return Math.min(1, done / total);
}

// --- Wake Lock -------------------------------------------------------------

async function acquireWakeLock() {
  if (!('wakeLock' in navigator)) {
    useUploadStore.setState({ wakeLock: 'unsupported' });
    return;
  }
  try {
    wakeSentinel = await navigator.wakeLock.request('screen');
    wakeSentinel.addEventListener('release', () => {
      wakeSentinel = null;
    });
    useUploadStore.setState({ wakeLock: 'active' });
  } catch {
    // Denied (battery saver, insecure context, ...): the UI shows a hint.
    useUploadStore.setState({ wakeLock: 'unsupported' });
  }
}

async function releaseWakeLock() {
  try {
    await wakeSentinel?.release();
  } catch {
    /* ignore */
  }
  wakeSentinel = null;
  useUploadStore.setState({ wakeLock: 'none' });
}

if (typeof document !== 'undefined') {
  // The browser drops the lock when the tab is hidden; get it back on return.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && running && !wakeSentinel) void acquireWakeLock();
  });
  window.addEventListener('beforeunload', (e) => {
    if (running) {
      e.preventDefault();
    }
  });
}

// --- Queue runner ----------------------------------------------------------

function nextQueued(): UploadItem | undefined {
  return useUploadStore.getState().items.find((i) => i.status === 'queued');
}

async function runQueue(): Promise<void> {
  if (running) return;
  running = true;
  await acquireWakeLock();
  try {
    let item = nextQueued();
    while (item) {
      await uploadOne(item);
      item = nextQueued();
    }
  } finally {
    running = false;
    await releaseWakeLock();
  }
}

function uploadOne(item: UploadItem): Promise<void> {
  const entry = pending.get(item.id);
  if (!entry) {
    patch(item.id, { status: 'error', error: 'Datei nicht mehr verfügbar' });
    return Promise.resolve();
  }

  patch(item.id, { status: 'uploading', loaded: 0, attempts: item.attempts + 1 });

  return new Promise<void>((resolve) => {
    const xhr = new XMLHttpRequest();
    currentXhr = xhr;
    xhr.open('POST', '/upload');
    for (const [k, v] of Object.entries(API_HEADERS)) xhr.setRequestHeader(k, v);
    xhr.timeout = 0; // large files on slow Wi-Fi: no client-side limit, the user can cancel

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) patch(item.id, { loaded: Math.min(e.loaded, item.size) });
    };

    const fail = (message: string, retryable: boolean) => {
      currentXhr = null;
      const attempts = useUploadStore.getState().items.find((i) => i.id === item.id)?.attempts ?? 1;
      if (retryable && attempts <= MAX_AUTO_RETRIES) {
        patch(item.id, { status: 'queued', loaded: 0 });
        setTimeout(resolve, 1500); // short back-off, then the runner picks it up again
      } else {
        patch(item.id, { status: 'error', error: message });
        resolve();
      }
    };

    xhr.onload = () => {
      currentXhr = null;
      let body: { ok?: boolean; message?: string; replaced?: boolean } | null = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        /* not JSON */
      }
      if (xhr.status >= 200 && xhr.status < 300 && body?.ok) {
        patch(item.id, { status: 'done', loaded: item.size, replaced: Boolean(body.replaced) });
        resolve();
      } else if (xhr.status === 404 || xhr.status === 502 || xhr.status === 503) {
        fail('Upload-Dienst auf der Box nicht erreichbar', false);
      } else {
        fail(body?.message ?? `Fehler ${xhr.status}`, xhr.status >= 500 && xhr.status !== 507);
      }
    };
    xhr.onerror = () => fail('Verbindung zur Box unterbrochen', true);
    xhr.ontimeout = () => fail('Zeitüberschreitung', true);
    xhr.onabort = () => {
      currentXhr = null;
      patch(item.id, { status: 'canceled' });
      resolve();
    };

    // Field order matters: the service streams, so `path` has to come before `file`.
    const form = new FormData();
    form.append('path', item.path);
    form.append('file', entry.file, entry.file.name);
    xhr.send(form);
  });
}
