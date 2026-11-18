import { useConnectionStore } from '../stores/connectionStore';
import { useTranslation } from 'react-i18next';
import styles from './ConnectionStatus.module.css';

/** Friendly banner shown while the box cannot be reached. */
export function ConnectionStatus() {
  const state = useConnectionStore((s) => s.state);
  const { t } = useTranslation();

  if (state === 'connected') return null;

  return (
    <div className={`${styles.bar} ${styles[state]}`} role="status" aria-live="polite">
      {state !== 'disconnected' && <span className={styles.spinner} />}
      <div className={styles.text}>
        <strong>{t(`general.connection.${state}`)}</strong>
        {state !== 'connecting' && <span>{t('general.connection.hint')}</span>}
      </div>
    </div>
  );
}
