/**
 * Client for the small upload/file service (deploy/upload-service).
 * nginx forwards `/upload` and `/files/` to it. Everything is same-origin.
 */

export interface FileEntry {
  name: string;
  type: 'dir' | 'file';
  size: number;
  mtime: number;
}

export interface FileInfo {
  max_bytes: number;
  allowed_extensions: string[];
  free_bytes: number;
  /** yt-dlp is installed on the box (import from link possible). */
  import_available?: boolean;
}

/** Background download of a link (yt-dlp -> mp3) on the box. */
export interface ImportJob {
  id: string;
  state: 'running' | 'done' | 'error' | 'cancelled';
  /** 'download' while yt-dlp fetches the audio, 'convert' while it writes the mp3. */
  stage?: 'download' | 'convert' | 'done';
  /** 0-100 while downloading, null otherwise. */
  progress?: number | null;
  /** Folder (relative to the audio root) the mp3 was stored in, once done. */
  folder: string | null;
  file: string | null;
  message: string;
}

export class FileApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = 'FileApiError';
    this.code = code;
    this.status = status;
  }
}

/** Custom header = cheap CSRF protection (forces a CORS preflight cross-origin). */
export const API_HEADERS = { 'X-Requested-With': 'phoniebox' } as const;

export function joinPath(...parts: string[]): string {
  return parts
    .join('/')
    .split('/')
    .filter((p) => p !== '' && p !== '.')
    .join('/');
}

export function parentPath(path: string): string {
  const i = path.lastIndexOf('/');
  return i < 0 ? '' : path.slice(0, i);
}

export function baseName(path: string): string {
  const i = path.lastIndexOf('/');
  return i < 0 ? path : path.slice(i + 1);
}

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { ...init, headers: { ...API_HEADERS, ...(init?.headers ?? {}) } });
  } catch {
    throw new FileApiError('unreachable', 'Die Box ist nicht erreichbar.', 0);
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    /* not JSON (e.g. nginx 404 when the upload service is not installed) */
  }

  const data = body as { ok?: boolean; error?: string; message?: string } | null;
  if (!response.ok || !data || data.ok === false) {
    if (response.status === 404 || response.status === 502 || response.status === 503) {
      throw new FileApiError(
        'service-missing',
        'Der Upload-Dienst läuft auf der Box nicht (siehe deploy/INSTALL.md).',
        response.status,
      );
    }
    throw new FileApiError(
      data?.error ?? 'error',
      data?.message ?? `Fehler ${response.status}`,
      response.status,
    );
  }
  return data as T;
}

const postJson = <T>(url: string, payload: unknown) =>
  call<T>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

export const filesApi = {
  list: (path: string) =>
    call<{ items: FileEntry[] }>(`/files/list?path=${encodeURIComponent(path)}`).then((r) => r.items),
  info: () => call<FileInfo>('/files/info'),
  mkdir: (path: string) => postJson<{ ok: true }>('/files/mkdir', { path }),
  remove: (path: string) => postJson<{ ok: true }>('/files/delete', { path }),
  rename: (path: string, to: string) => postJson<{ ok: true }>('/files/rename', { path, to }),
  /** Start a download; without `folder` the box creates a folder named after the title. */
  importStart: (url: string, folder?: string) =>
    postJson<ImportJob>('/files/import', folder ? { url, folder } : { url }),
  importStatus: (id: string) => call<ImportJob>(`/files/import/status?id=${encodeURIComponent(id)}`),
  importCancel: (id: string) => postJson<ImportJob>('/files/import/cancel', { id }),
};
