import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useRequest } from '../../../hooks/useRequest';
import { request } from '../../../services/request';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import { Dialog } from '../../../components/Dialog';
import { showToast } from '../../../components/Toast';
import { usePubSubStore } from '../../../stores/pubSubStore';
import { filesApi, FileApiError, joinPath, parentPath, baseName } from '../../../services/files';
import styles from '../library.module.css';

interface FolderItem {
  name: string;
  relpath: string;
  type: 'directory' | 'file' | 'stream' | 'podcast';
}

type Sheet =
  | { kind: 'menu'; item: FolderItem }
  | { kind: 'rename'; item: FolderItem }
  | { kind: 'delete'; item: FolderItem }
  | { kind: 'mkdir' }
  | null;

/**
 * Folder view of the audio library.
 *
 * mode "play":   everybody (children): browse and start music
 * mode "manage": behind the parent PIN: create / rename / delete / upload / assign card
 */
export function FolderBrowser({ mode }: { mode: 'play' | 'manage' }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const splat = useParams()['*'] ?? '';
  const dir = decodeURIComponent(splat).replace(/^\/+|\/+$/g, '');
  const base = mode === 'manage' ? '/library/manage' : '/library/folders';
  const kidsbox = usePubSubStore((s) => Boolean(s.pluginsLoaded['kidsbox']));

  const { data, isLoading, error, refetch } = useRequest<FolderItem[]>('folderList', { folder: dir || '.' });
  const [sheet, setSheet] = useState<Sheet>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const go = (path: string) => navigate(`${base}/${path.split('/').map(encodeURIComponent).join('/')}`.replace(/\/$/, ''));

  const playFolder = (folder: string) => {
    // Prefer the kid-aware player (resume, soft fade) when the plugin is installed.
    void request(kidsbox ? 'kidsbox_play_card' : 'play_folder', { folder, recursive: true });
    showToast('info', t('library.folders.playing', { name: baseName(folder) }));
  };

  const run = async (fn: () => Promise<unknown>, okMessage: string) => {
    setBusy(true);
    try {
      await fn();
      showToast('success', okMessage);
      setSheet(null);
      refetch();
    } catch (e) {
      showToast('error', e instanceof FileApiError ? e.message : t('library.manage.failed'));
    } finally {
      setBusy(false);
    }
  };

  const crumbs = dir === '' ? [] : dir.split('/');

  return (
    <div>
      {mode === 'manage' ? (
        <div className={styles.toolbar}>
          <button className="ui-btn" onClick={() => { setText(''); setSheet({ kind: 'mkdir' }); }}>
            📁 {t('library.filemanager.newfolder')}
          </button>
          <Link className="ui-btn ui-btn-primary" to={`/library/upload?dir=${encodeURIComponent(dir)}`}>
            ↑ {t('library.filemanager.upload')}
          </Link>
          <Link className="ui-btn" to={dir ? `/library/folders/${dir.split('/').map(encodeURIComponent).join('/')}` : '/library/folders'}>
            ✓ {t('library.manage.done')}
          </Link>
        </div>
      ) : (
        <div className={styles.toolbar}>
          <Link className="ui-btn" to={`/library/manage/${dir.split('/').filter(Boolean).map(encodeURIComponent).join('/')}`}>
            🔒 {t('library.manage.open')}
          </Link>
        </div>
      )}

      <nav className={styles.crumbs} aria-label={t('library.folders.path')}>
        <button className={styles.crumb} onClick={() => go('')}>
          {t('library.folders.root')}
        </button>
        {crumbs.map((c, i) => (
          <span key={i}>
            {' / '}
            <button className={styles.crumb} onClick={() => go(crumbs.slice(0, i + 1).join('/'))}>
              {c}
            </button>
          </span>
        ))}
      </nav>

      {isLoading ? (
        <LoadingSpinner />
      ) : error ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>📡</span>
          <p>{t('general.loadingerror')}</p>
          <button className="ui-btn" onClick={refetch}>{t('general.buttons.retry')}</button>
        </div>
      ) : !data || data.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>📁</span>
          <p>{t('library.folders.nofolders')}</p>
          {mode === 'play' && <p className="ui-hint">{t('library.folders.emptyhint')}</p>}
        </div>
      ) : (
        <div className={styles.list}>
          {data.map((item) => {
            const isDir = item.type === 'directory';
            return (
              <div key={item.relpath} className={styles.listItem}>
                <button
                  className={styles.rowMain}
                  onClick={() => (isDir ? go(item.relpath) : request('play_single', { song_url: item.relpath }))}
                >
                  <span className={styles.itemIcon}>{isDir ? '📁' : '♪'}</span>
                  <span className={styles.itemInfo}>
                    <span className={styles.itemTitle} style={{ display: 'block' }}>{item.name}</span>
                  </span>
                </button>
                {isDir && mode === 'play' && (
                  <button
                    className={styles.iconBtn}
                    aria-label={t('library.folders.playfolder', { name: item.name })}
                    onClick={() => playFolder(item.relpath)}
                  >
                    ▶
                  </button>
                )}
                {mode === 'manage' && (
                  <button
                    className={styles.iconBtn}
                    aria-label={t('library.manage.actions', { name: item.name })}
                    onClick={() => setSheet({ kind: 'menu', item })}
                  >
                    ⋯
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* action menu */}
      <Dialog
        open={sheet?.kind === 'menu'}
        onClose={() => setSheet(null)}
        title={sheet?.kind === 'menu' ? sheet.item.name : ''}
        actions={<button className="ui-btn" onClick={() => setSheet(null)}>{t('general.buttons.close')}</button>}
      >
        {sheet?.kind === 'menu' && (
          <div className={styles.sheetActions}>
            {sheet.item.type === 'directory' && (
              <>
                <button className="ui-btn" onClick={() => { playFolder(sheet.item.relpath); setSheet(null); }}>
                  ▶ {t('general.buttons.play')}
                </button>
                <button
                  className="ui-btn"
                  onClick={() => navigate(`/cards/new?folder=${encodeURIComponent(sheet.item.relpath)}`)}
                >
                  💳 {t('library.manage.assigncard')}
                </button>
              </>
            )}
            <button className="ui-btn" onClick={() => { setText(sheet.item.name); setSheet({ kind: 'rename', item: sheet.item }); }}>
              ✎ {t('general.buttons.rename')}
            </button>
            <button className="ui-btn ui-btn-danger" onClick={() => setSheet({ kind: 'delete', item: sheet.item })}>
              🗑 {t('general.buttons.delete')}
            </button>
          </div>
        )}
      </Dialog>

      {/* rename */}
      <Dialog
        open={sheet?.kind === 'rename'}
        onClose={() => setSheet(null)}
        title={t('library.manage.renametitle')}
        actions={
          <>
            <button className="ui-btn" onClick={() => setSheet(null)}>{t('general.buttons.cancel')}</button>
            <button
              className="ui-btn ui-btn-primary"
              disabled={busy || text.trim() === '' || text.includes('/')}
              onClick={() => {
                if (sheet?.kind !== 'rename') return;
                const to = joinPath(parentPath(sheet.item.relpath), text.trim());
                void run(() => filesApi.rename(sheet.item.relpath, to), t('library.manage.renamed'));
              }}
            >
              {t('general.buttons.save')}
            </button>
          </>
        }
      >
        <input className="ui-input" value={text} onChange={(e) => setText(e.target.value)} aria-label={t('library.manage.newname')} />
        <p className="ui-hint" style={{ marginTop: 8 }}>{t('library.manage.renamehint')}</p>
      </Dialog>

      {/* delete */}
      <Dialog
        open={sheet?.kind === 'delete'}
        onClose={() => setSheet(null)}
        title={t('library.manage.deletetitle')}
        actions={
          <>
            <button className="ui-btn" onClick={() => setSheet(null)}>{t('general.buttons.cancel')}</button>
            <button
              className="ui-btn ui-btn-danger"
              disabled={busy}
              onClick={() => {
                if (sheet?.kind !== 'delete') return;
                void run(() => filesApi.remove(sheet.item.relpath), t('library.manage.deleted'));
              }}
            >
              {t('general.buttons.delete')}
            </button>
          </>
        }
      >
        {sheet?.kind === 'delete' && (
          <p>
            {sheet.item.type === 'directory'
              ? t('library.manage.deletefolderconfirm', { name: sheet.item.name })
              : t('library.manage.deletefileconfirm', { name: sheet.item.name })}
          </p>
        )}
      </Dialog>

      {/* new folder */}
      <Dialog
        open={sheet?.kind === 'mkdir'}
        onClose={() => setSheet(null)}
        title={t('library.filemanager.newfolder')}
        actions={
          <>
            <button className="ui-btn" onClick={() => setSheet(null)}>{t('general.buttons.cancel')}</button>
            <button
              className="ui-btn ui-btn-primary"
              disabled={busy || text.trim() === '' || text.includes('/')}
              onClick={() => void run(() => filesApi.mkdir(joinPath(dir, text.trim())), t('library.manage.created'))}
            >
              {t('general.buttons.create')}
            </button>
          </>
        }
      >
        <input
          className="ui-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('library.manage.foldername')}
          aria-label={t('library.manage.foldername')}
        />
      </Dialog>
    </div>
  );
}
