import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRequest } from '../../../hooks/useRequest';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import { parentPath } from '../../../services/files';
import styles from '../cards.module.css';

interface Item {
  name: string;
  relpath: string;
  type: string;
}

interface Props {
  value: string;
  onChange: (folder: string) => void;
}

/** Simple drill-down folder chooser (touch friendly, no tree). */
export function FolderPicker({ value, onChange }: Props) {
  const { t } = useTranslation();
  const [dir, setDir] = useState(parentPath(value));
  const { data, isLoading, error } = useRequest<Item[]>('folderList', { folder: dir || '.' });
  const dirs = (data ?? []).filter((i) => i.type === 'directory');

  return (
    <div className="ui-field">
      <span className="ui-label">{t('cards.form.folder')}: <strong>{value || t('cards.form.noneselected')}</strong></span>
      <div className={styles.folderList}>
        {dir !== '' && (
          <button className={styles.folderRow} onClick={() => setDir(parentPath(dir))}>
            <span className="ui-icon">←</span>
            <span>{t('general.buttons.back')}</span>
          </button>
        )}
        {isLoading && <LoadingSpinner />}
        {error && <div className="ui-banner ui-banner-error">{t('general.loadingerror')}</div>}
        {!isLoading && dirs.length === 0 && dir !== '' && (
          <div className="ui-muted" style={{ padding: 12 }}>{t('cards.form.nosubfolders')}</div>
        )}
        {dirs.map((item) => (
          <div key={item.relpath} className="ui-row" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <button
              className={`${styles.folderRow} ${value === item.relpath ? styles.selected : ''}`}
              style={{ borderBottom: 'none' }}
              onClick={() => onChange(item.relpath)}
              aria-pressed={value === item.relpath}
            >
              <span className="ui-icon">{value === item.relpath ? '✓' : '📁'}</span>
              <span className="ui-ellipsis">{item.name}</span>
            </button>
            <button className="ui-btn" style={{ border: 'none', background: 'transparent' }} onClick={() => setDir(item.relpath)} aria-label={t('cards.form.openfolder', { name: item.name })}>
              ›
            </button>
          </div>
        ))}
      </div>
      {dir !== '' && (
        <button className="ui-btn" onClick={() => onChange(dir)}>
          {t('cards.form.choosethisfolder', { name: dir.split('/').pop() })}
        </button>
      )}
    </div>
  );
}
