import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePubSubStore } from '../../../stores/pubSubStore';
import { useSettingsStore } from '../../../stores/settingsStore';
import { usePrefsStore, limitJump } from '../../../stores/prefsStore';
import { request } from '../../../services/request';
import styles from '../player.module.css';

/**
 * Volume control for kids and parents.
 *
 * - the slider ends at the box's soft maximum (hearing protection, set in
 *   "Kinder & Eltern"); the backend enforces the same limit
 * - one gesture can only change the volume by `maxVolumeJump` points, so a
 *   toddler cannot go from quiet to loud with a single swipe
 */
export function Volume() {
  const { t } = useTranslation();
  const volume = usePubSubStore((s) => s.volume);
  const softMax = useSettingsStore((s) => s.softMaxVolume);
  const maxJump = usePrefsStore((s) => s.maxVolumeJump);
  const step = usePrefsStore((s) => s.volumeStep);
  const [local, setLocal] = useState<number | null>(null);
  const dragStart = useRef(0);

  const level = local ?? volume.level;

  const apply = (value: number) => {
    const bounded = Math.max(0, Math.min(softMax, Math.round(value)));
    void request('setVolume', { volume: bounded });
  };

  const bump = (delta: number) => {
    const target = limitJump(volume.level, volume.level + delta, maxJump);
    apply(target);
  };

  const icon = volume.mute || level === 0 ? '🔇' : level < 40 ? '🔉' : '🔊';

  return (
    <div>
      <div className={styles.volume}>
        <button
          className={`${styles.btn} ${styles.secondary} ${volume.mute ? styles.muted : ''}`}
          onClick={() => request('toggleMuteVolume')}
          aria-label={volume.mute ? t('player.volume.unmute') : t('player.volume.mute')}
          aria-pressed={volume.mute}
        >
          {icon}
        </button>
        <button
          className={`${styles.btn} ${styles.secondary}`}
          onClick={() => bump(-step)}
          aria-label={t('player.volume.down')}
        >
          −
        </button>
        <div className={styles.volWrap}>
          <input
            type="range"
            min={0}
            max={Math.max(softMax, 1)}
            value={Math.min(level, softMax)}
            aria-label={t('player.volume.label')}
            onPointerDown={() => {
              dragStart.current = volume.level;
            }}
            onFocus={() => {
              dragStart.current = volume.level;
            }}
            onChange={(e) => setLocal(limitJump(dragStart.current, Number(e.target.value), maxJump))}
            onPointerUp={() => {
              if (local !== null) apply(local);
              setLocal(null);
            }}
            onKeyUp={() => {
              if (local !== null) apply(local);
              setLocal(null);
            }}
            className={styles.slider}
            style={{ '--progress': `${(Math.min(level, softMax) / Math.max(softMax, 1)) * 100}%` } as React.CSSProperties}
          />
        </div>
        <button
          className={`${styles.btn} ${styles.secondary}`}
          onClick={() => bump(step)}
          aria-label={t('player.volume.up')}
          disabled={level >= softMax}
        >
          +
        </button>
        <span className={styles.volumeLevel}>{level}</span>
      </div>
      {softMax < 100 && (
        <p className={styles.limit}>{t('player.volume.limit', { max: softMax })}</p>
      )}
    </div>
  );
}
