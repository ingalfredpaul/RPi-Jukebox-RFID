import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Header } from '../../../components/Header';
import { filesApi, FileApiError, joinPath } from '../../../services/files';
import {
  useUploadStore,
  totalProgress,
  type UploadItem,
} from '../../../services/uploader';
import { UPLOAD_EXTENSIONS } from '../../../config';
import styles from '../library.module.css';

const ACCEPT = UPLOAD_EXTENSIONS.map((e) => `.${e}`).join(',');

function formatBytes(n: number): string {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(1)} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(n / 1024))} KB`;
}

function ItemRow({ item }: { item: UploadItem }) {
  const { t } = useTranslation();
  const cancel = useUploadStore((s) => s.cancel);
  const retry = useUploadStore((s) => s.retry);
  const pct = item.size > 0 ? Math.round((item.loaded / item.size) * 100) : 0;

  return (
    <div className={styles.queueItem}>
      <div className={styles.queueHead}>
        <span className={styles.queueName}>{item.name}</span>
        {(item.status === 'queued' || item.status === 'uploading') && (
          <button className={styles.smallBtn} onClick={() => cancel(item.id)}>{t('general.buttons.cancel')}</button>
        )}
        {(item.status === 'error' || item.status === 'canceled') && (
          <button className={styles.smallBtn} onClick={() => retry(item.id)}>{t('general.buttons.retry')}</button>
        )}
      </div>
      <div className="ui-progress" aria-hidden="true">
        <span style={{ width: `${item.status === 'done' ? 100 : pct}%` }} />
      </div>
      <div className={styles.queueStatus}>
        {item.status === 'queued' && t('upload.status.queued')}
        {item.status === 'uploading' && `${pct}% · ${formatBytes(item.loaded)} / ${formatBytes(item.size)}`}
        {item.status === 'done' && `✓ ${t('upload.status.done')}${item.replaced ? ` (${t('upload.status.replaced')})` : ''}`}
        {item.status === 'canceled' && t('upload.status.canceled')}
      </div>
      {item.status === 'error' && <div className={styles.queueError}>✗ {item.error}</div>}
    </div>
  );
}

export function UploadPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const dir = (params.get('dir') ?? '').replace(/^\/+|\/+$/g, '');
  const [subFolder, setSubFolder] = useState('');
  const [serviceError, setServiceError] = useState<string | null>(null);
  const [freeBytes, setFreeBytes] = useState<number | null>(null);

  const items = useUploadStore((s) => s.items);
  const skipped = useUploadStore((s) => s.skipped);
  const wakeLock = useUploadStore((s) => s.wakeLock);
  const addFiles = useUploadStore((s) => s.addFiles);
  const setMaxBytes = useUploadStore((s) => s.setMaxBytes);
  const cancelAll = useUploadStore((s) => s.cancelAll);
  const retryFailed = useUploadStore((s) => s.retryFailed);
  const clearFinished = useUploadStore((s) => s.clearFinished);
  const clearSkipped = useUploadStore((s) => s.clearSkipped);

  const filesInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    filesApi
      .info()
      .then((info) => {
        setMaxBytes(info.max_bytes);
        setFreeBytes(info.free_bytes);
        setServiceError(null);
      })
      .catch((e: unknown) => setServiceError(e instanceof FileApiError ? e.message : t('upload.servicedown')));
  }, [setMaxBytes, t]);

  const active = items.some((i) => i.status === 'uploading' || i.status === 'queued');
  const failed = items.filter((i) => i.status === 'error' || i.status === 'canceled').length;
  const done = items.filter((i) => i.status === 'done').length;
  const progress = totalProgress(items);
  const target = joinPath(dir, subFolder.trim()) || t('library.folders.root');

  const pick = (list: FileList | null) => {
    if (list && list.length > 0) addFiles(Array.from(list), dir, subFolder.trim());
  };

  return (
    <div>
      <Header
        title={t('library.filemanager.title')}
        showBack
        backTo={`/library/manage/${dir.split('/').filter(Boolean).map(encodeURIComponent).join('/')}`}
      />
      <div className="ui-page">
        {serviceError && <div className="ui-banner ui-banner-error">{serviceError}</div>}

        <div className="ui-card">
          <div className="ui-card-title">{t('upload.target')}</div>
          <div className="ui-card-body">
            <p className="ui-wrap-anywhere"><strong>{target}</strong></p>
            <div className="ui-field">
              <label className="ui-label" htmlFor="subfolder">{t('upload.newfolderlabel')}</label>
              <input
                id="subfolder"
                className="ui-input"
                value={subFolder}
                onChange={(e) => setSubFolder(e.target.value.replace(/[\\]/g, ''))}
                placeholder={t('upload.newfolderplaceholder')}
                disabled={active}
              />
              <span className="ui-hint">{t('upload.newfolderhint')}</span>
            </div>
            <div className={styles.pickRow}>
              <button className="ui-btn ui-btn-primary" onClick={() => filesInput.current?.click()}>
                🎵 {t('upload.pickfiles')}
              </button>
              <button className="ui-btn" onClick={() => folderInput.current?.click()}>
                📁 {t('upload.pickfolder')}
              </button>
            </div>
            <input
              ref={filesInput}
              className={styles.hiddenInput}
              type="file"
              multiple
              accept={ACCEPT}
              onChange={(e) => { pick(e.target.files); e.target.value = ''; }}
              tabIndex={-1}
            />
            <input
              ref={folderInput}
              className={styles.hiddenInput}
              type="file"
              multiple
              // Non-standard but supported by Chrome/Android, Firefox and desktop Safari.
              {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
              onChange={(e) => { pick(e.target.files); e.target.value = ''; }}
              tabIndex={-1}
            />
            <p className="ui-hint">{t('upload.formats', { list: UPLOAD_EXTENSIONS.join(', ') })}</p>
            {freeBytes !== null && <p className="ui-hint">{t('upload.free', { size: formatBytes(freeBytes) })}</p>}
          </div>
        </div>

        {active && (
          <div className={`ui-banner ${wakeLock === 'active' ? 'ui-banner-ok' : 'ui-banner-warn'}`}>
            {wakeLock === 'active' ? t('upload.screenon') : t('upload.keepopen')}
          </div>
        )}

        {items.length > 0 && (
          <div className="ui-card">
            <div className="ui-card-title">
              {t('upload.queue', { done, total: items.length })}
            </div>
            <div className="ui-card-body">
              <div className="ui-progress" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
                <span style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
              <div className="ui-row ui-row-wrap">
                {active && <button className="ui-btn ui-btn-danger" onClick={cancelAll}>{t('upload.cancelall')}</button>}
                {failed > 0 && !active && (
                  <button className="ui-btn ui-btn-primary" onClick={retryFailed}>{t('upload.retryfailed', { count: failed })}</button>
                )}
                {!active && (
                  <button className="ui-btn" onClick={clearFinished}>{t('upload.clear')}</button>
                )}
              </div>
            </div>
            {items.map((item) => <ItemRow key={item.id} item={item} />)}
          </div>
        )}

        {skipped.length > 0 && (
          <div className="ui-banner ui-banner-warn">
            <strong>{t('upload.skipped', { count: skipped.length })}</strong>
            <ul style={{ margin: '8px 0', paddingLeft: 16, listStyle: 'disc' }}>
              {skipped.slice(0, 8).map((s, i) => (
                <li key={i} className="ui-wrap-anywhere">{s.name} ({t(`upload.skip.${s.reason.replace(/-/g, "")}`)})</li>
              ))}
              {skipped.length > 8 && <li>… {skipped.length - 8}</li>}
            </ul>
            <button className={styles.smallBtn} onClick={clearSkipped}>{t('general.buttons.close')}</button>
          </div>
        )}

        <div className="ui-banner">
          <strong>{t('upload.tipstitle')}</strong>
          <ul style={{ margin: '8px 0 0', paddingLeft: 16, listStyle: 'disc' }}>
            <li>{t('upload.tiplock')}</li>
            <li>{t('upload.tipios')}</li>
            <li>{t('upload.tipwifi')}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
