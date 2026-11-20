import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileApiError, filesApi, type ImportJob } from '../../../services/files';

interface Props {
  /** Called with the new folder (relative to the audio root) once the mp3 is on the box. */
  onDone: (folder: string) => void;
}

const POLL_MS = 2000;

/**
 * "Load from link": the box downloads the audio of a link (yt-dlp) as mp3 into a new folder
 * named after the title. Hidden when yt-dlp is not installed on the box.
 */
export function LinkImport({ onDone }: Props) {
  const { t } = useTranslation();
  const [available, setAvailable] = useState(false);
  const [url, setUrl] = useState('');
  const [running, setRunning] = useState(false);
  const [job, setJob] = useState<ImportJob | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    filesApi
      .info()
      .then((i) => alive.current && setAvailable(Boolean(i.import_available)))
      .catch(() => undefined);
    return () => {
      alive.current = false;
    };
  }, []);

  if (!available) return null;

  const start = async () => {
    setError('');
    setDone('');
    setRunning(true);
    try {
      let current = await filesApi.importStart(url.trim());
      setJob(current);
      while (current.state === 'running') {
        await new Promise((r) => setTimeout(r, POLL_MS));
        if (!alive.current) return;
        current = await filesApi.importStatus(current.id);
        setJob(current);
      }
      if (!alive.current) return;
      if (current.state === 'done' && current.folder) {
        setDone(current.file ?? current.folder);
        setUrl('');
        onDone(current.folder);
      } else if (current.state === 'cancelled') {
        setError(t('cards.import.cancelled'));
      } else {
        setError(current.message || t('cards.import.failed'));
      }
    } catch (e) {
      if (alive.current) setError(e instanceof FileApiError ? e.message : t('cards.import.failed'));
    } finally {
      if (alive.current) {
        setRunning(false);
        setCancelling(false);
        setJob(null);
      }
    }
  };

  // The polling loop in start() ends by itself once the box reports "cancelled".
  const cancel = async () => {
    if (!job) return;
    setCancelling(true);
    try {
      await filesApi.importCancel(job.id);
    } catch (e) {
      if (alive.current) {
        setCancelling(false);
        setError(e instanceof FileApiError ? e.message : t('cards.import.failed'));
      }
    }
  };

  const percent = job?.progress ?? null;
  const progressText =
    job?.stage === 'convert'
      ? t('cards.import.convert')
      : percent !== null
        ? t('cards.import.progress', { percent })
        : t('cards.import.preparing');

  return (
    <div className="ui-field">
      <label className="ui-label" htmlFor="importurl">{t('cards.import.label')}</label>
      <input
        id="importurl"
        className="ui-input"
        type="url"
        inputMode="url"
        placeholder="https://…"
        value={url}
        disabled={running}
        onChange={(e) => setUrl(e.target.value)}
      />
      <span className="ui-hint">{t('cards.import.hint')}</span>
      <button className="ui-btn" disabled={running || !/^https?:\/\/\S+$/i.test(url.trim())} onClick={() => void start()}>
        {running ? t('cards.import.running') : t('cards.import.start')}
      </button>
      {running && (
        <>
          <div className="ui-banner">{progressText}</div>
          <div
            className="ui-progress"
            role="progressbar"
            aria-valuenow={percent ?? undefined}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span style={{ width: `${percent ?? (job?.stage === 'convert' ? 100 : 0)}%` }} />
          </div>
          <span className="ui-hint">{t('cards.import.wait')}</span>
          <button className="ui-btn" disabled={cancelling || !job} onClick={() => void cancel()}>
            {cancelling ? t('cards.import.cancelling') : t('cards.import.cancel')}
          </button>
        </>
      )}
      {done && <div className="ui-banner ui-banner-ok">{t('cards.import.done', { name: done })}</div>}
      {error && <div className="ui-banner ui-banner-error">{error}</div>}
    </div>
  );
}
