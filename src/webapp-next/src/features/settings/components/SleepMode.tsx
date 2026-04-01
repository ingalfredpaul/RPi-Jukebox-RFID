import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { request } from '../../../services/request';
import styles from '../settings.module.css';

export function SleepMode() {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(false);
  const [timeout, setTimeout_] = useState(0);

  useEffect(() => {
    request<{ enabled: boolean; remaining: number; wait_seconds: number }>('timer_idle_shutdown.get_state' as any).then(({ result }) => {
      if (result) {
        setEnabled(result.enabled);
        setTimeout_(result.wait_seconds ? result.wait_seconds / 60 : 0);
      }
    });
  }, []);

  const handleToggle = async () => {
    if (enabled) {
      await request('timer_idle_shutdown.cancel' as any);
      setEnabled(false);
    } else if (timeout > 0) {
      await request('timer_idle_shutdown' as any, { wait_seconds: timeout * 60 });
      setEnabled(true);
    }
  };

  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>{t('settings.sleep-mode.title')}</div>
      <div className={styles.cardBody}>
        <div className={styles.row}>
          <span className={styles.rowLabel}>{t('settings.sleep-mode.enable')}</span>
          <div className={`${styles.toggle} ${enabled ? styles.active : ''}`} onClick={handleToggle}>
            <div className={styles.toggleKnob} />
          </div>
        </div>
        <p className={styles.hint}>{t('settings.sleep-mode.description')}</p>
      </div>
    </section>
  );
}
