import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { request } from '../../../services/request';
import { showToast } from '../../../components/Toast';
import styles from '../settings.module.css';

export function AudioSettings() {
  const { t } = useTranslation();
  const [maxVolume, setMaxVolume] = useState(100);

  useEffect(() => {
    request<number>('getMaxVolume').then(({ result }) => {
      if (result !== undefined) setMaxVolume(result);
    });
  }, []);

  const handleMaxVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    setMaxVolume(value);
  };

  const handleMaxVolumeCommit = () => {
    request('setMaxVolume', { volume: maxVolume });
    showToast('success', t('toast.settings-saved'));
  };

  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>{t('settings.audio.title')}</div>
      <div className={styles.cardBody}>
        <div className={styles.sliderRow}>
          <div className={styles.sliderLabel}>
            <span className={styles.sliderLabelText}>{t('settings.audio.max-volume')}</span>
            <span className={styles.sliderValue}>{maxVolume}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={maxVolume}
            onChange={handleMaxVolumeChange}
            onMouseUp={handleMaxVolumeCommit}
            onTouchEnd={handleMaxVolumeCommit}
          />
          <p className={styles.hint}>{t('settings.audio.max-volume-hint')}</p>
        </div>
      </div>
    </section>
  );
}
