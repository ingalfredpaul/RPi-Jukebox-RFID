import { useConnectionStore } from '../stores/connectionStore';
import { useTranslation } from 'react-i18next';
import styles from './ConnectionStatus.module.css';

export function ConnectionStatus() {
  const state = useConnectionStore((s) => s.state);
  const { t } = useTranslation();

  if (state === 'connected') return null;

  return (
    <div className={`${styles.bar} ${styles[state]}`}>
      {state === 'reconnecting' && <span className={styles.spinner} />}
      <span>{t(`general.connection.${state}`)}</span>
    </div>
  );
}
