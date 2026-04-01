import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { request } from '../../../services/request';
import styles from '../settings.module.css';

export function NetworkSettings() {
  const { t } = useTranslation();
  const [hotspotActive, setHotspotActive] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    request<boolean>('getAutohotspotStatus').then(({ result }) => {
      if (result !== undefined) setHotspotActive(result);
    });
  }, []);

  const handleToggle = async () => {
    setLoading(true);
    if (hotspotActive) {
      await request('stopAutohotspot');
      setHotspotActive(false);
    } else {
      await request('startAutohotspot');
      setHotspotActive(true);
    }
    setLoading(false);
  };

  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>{t('settings.system.autohotspot')}</div>
      <div className={styles.cardBody}>
        <div className={styles.row}>
          <div>
            <span className={styles.rowLabel}>{t('settings.system.autohotspot')}</span>
            <p className={styles.hint}>{t('settings.system.autohotspot-hint')}</p>
          </div>
          <div
            className={`${styles.toggle} ${hotspotActive ? styles.active : ''}`}
            onClick={loading ? undefined : handleToggle}
            style={{ opacity: loading ? 0.5 : 1 }}
          >
            <div className={styles.toggleKnob} />
          </div>
        </div>
      </div>
    </section>
  );
}
