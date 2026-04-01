import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePubSubStore } from '../../../stores/pubSubStore';
import { request } from '../../../services/request';
import styles from '../settings.module.css';

export function SystemStatus() {
  const { t } = useTranslation();
  const cpuTemp = usePubSubStore((s) => s.cpuTemp);
  const coreVersion = usePubSubStore((s) => s.coreVersion);
  const batteryStatus = usePubSubStore((s) => s.batteryStatus);

  const [ipAddress, setIpAddress] = useState<string>('–');
  const [diskUsage, setDiskUsage] = useState<string>('–');

  useEffect(() => {
    request<string>('getIpAddress').then(({ result }) => {
      if (result) setIpAddress(result);
    });
    request<string>('getDiskUsage').then(({ result }) => {
      if (result) setDiskUsage(result);
    });
  }, []);

  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>{t('settings.status.title')}</div>
      <div className={styles.cardBody}>
        <div className={styles.statusGrid}>
          <div className={styles.statusItem}>
            <span className={styles.statusLabel}>{t('settings.status.version')}</span>
            <span className={styles.statusValue}>{coreVersion || '–'}</span>
          </div>
          <div className={styles.statusItem}>
            <span className={styles.statusLabel}>{t('settings.status.cpu-temp')}</span>
            <span className={styles.statusValue}>
              {cpuTemp !== null ? `${cpuTemp.toFixed(1)}°C` : '–'}
            </span>
          </div>
          <div className={styles.statusItem}>
            <span className={styles.statusLabel}>{t('settings.status.ip-address')}</span>
            <span className={styles.statusValue}>{ipAddress}</span>
          </div>
          <div className={styles.statusItem}>
            <span className={styles.statusLabel}>{t('settings.status.disk-usage')}</span>
            <span className={styles.statusValue}>{diskUsage}</span>
          </div>
          {batteryStatus && (
            <div className={styles.statusItem}>
              <span className={styles.statusLabel}>{t('settings.status.battery')}</span>
              <span className={styles.statusValue}>
                {batteryStatus.level}% {batteryStatus.charging ? '⚡' : ''}
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
