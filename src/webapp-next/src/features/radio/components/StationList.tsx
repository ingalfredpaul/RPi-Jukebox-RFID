import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRadioStore } from '../../../stores/radioStore';
import { showToast } from '../../../components/Toast';
import styles from '../radio.module.css';

export function StationList() {
  const { t } = useTranslation();
  const stations = useRadioStore((s) => s.stations);
  const addStation = useRadioStore((s) => s.addStation);
  const removeStation = useRadioStore((s) => s.removeStation);
  const playStation = useRadioStore((s) => s.playStation);

  const [name, setName] = useState('');
  const [url, setUrl] = useState('');

  const handleAdd = () => {
    if (!name.trim() || !url.trim()) return;
    addStation({ name: name.trim(), url: url.trim() });
    setName('');
    setUrl('');
    showToast('success', t('toast.settings-saved'));
  };

  return (
    <div>
      <div className={styles.addSection}>
        <div className={styles.addForm}>
          <input
            className={styles.input}
            placeholder={t('radio.stations.name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className={styles.addRow}>
            <input
              className={styles.input}
              placeholder={t('radio.stations.url')}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <button
              className={styles.addBtn}
              onClick={handleAdd}
              disabled={!name.trim() || !url.trim()}
            >
              {t('general.buttons.add')}
            </button>
          </div>
        </div>
      </div>

      {stations.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>📻</span>
          <p>{t('radio.stations.no-stations')}</p>
        </div>
      ) : (
        <div className={styles.list}>
          {stations.map((station) => (
            <div key={station.id} className={styles.stationItem}>
              <div className={styles.stationIcon}>📻</div>
              <div className={styles.stationInfo} onClick={() => playStation(station.id)}>
                <div className={styles.stationName}>{station.name}</div>
                <div className={styles.stationUrl}>{station.url}</div>
              </div>
              <div className={styles.stationActions}>
                <button
                  className={`${styles.actionBtn} ${styles.playBtn}`}
                  onClick={() => playStation(station.id)}
                  aria-label="Play"
                >
                  ▶
                </button>
                <button
                  className={`${styles.actionBtn} ${styles.deleteBtn}`}
                  onClick={() => removeStation(station.id)}
                  aria-label="Delete"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
