import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { request } from '../../../services/request';
import { TIMER_STEPS } from '../../../config';
import styles from '../settings.module.css';

interface TimerConfig {
  key: string;
  startCmd: string;
  cancelCmd: string;
  stateCmd: string;
}

const TIMERS: TimerConfig[] = [
  { key: 'shutdown', startCmd: 'timer_shutdown', cancelCmd: 'timer_shutdown.cancel', stateCmd: 'timer_shutdown.get_state' },
  { key: 'stop-player', startCmd: 'timer_stop_player', cancelCmd: 'timer_stop_player.cancel', stateCmd: 'timer_stop_player.get_state' },
  { key: 'fade-volume', startCmd: 'timer_fade_volume', cancelCmd: 'timer_fade_volume.cancel', stateCmd: 'timer_fade_volume.get_state' },
];

export function TimerSettings() {
  const { t } = useTranslation();
  const [timerStates, setTimerStates] = useState<Record<string, { enabled: boolean; remaining: number }>>({});

  const loadStates = useCallback(async () => {
    for (const timer of TIMERS) {
      const { result } = await request<{ enabled: boolean; remaining: number }>(timer.stateCmd as any);
      if (result) {
        setTimerStates((prev) => ({ ...prev, [timer.key]: result }));
      }
    }
  }, []);

  useEffect(() => {
    loadStates();
    const interval = setInterval(loadStates, 10000);
    return () => clearInterval(interval);
  }, [loadStates]);

  const handleSetTimer = async (timer: TimerConfig, minutes: number) => {
    if (minutes === 0) {
      await request(timer.cancelCmd as any);
    } else {
      await request(timer.startCmd as any, { wait_seconds: minutes * 60 });
    }
    loadStates();
  };

  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>{t('settings.timers.title')}</div>
      <div className={styles.cardBody}>
        {TIMERS.map((timer) => {
          const state = timerStates[timer.key];
          const isActive = state?.enabled;
          const remaining = state?.remaining ? Math.ceil(state.remaining / 60) : 0;

          return (
            <div key={timer.key} className={styles.timerItem}>
              <div className={styles.timerInfo}>
                <span className={styles.timerName}>{t(`settings.timers.${timer.key}`)}</span>
                <span className={`${styles.timerStatus} ${isActive ? styles.timerActive : ''}`}>
                  {isActive ? `${remaining} ${t('settings.timers.minutes')}` : t('settings.timers.inactive')}
                </span>
              </div>
              <select
                className={styles.select}
                value=""
                onChange={(e) => handleSetTimer(timer, Number(e.target.value))}
              >
                <option value="" disabled>{isActive ? t('settings.timers.cancel') : t('settings.timers.set-timer')}</option>
                {isActive && <option value="0">{t('settings.timers.cancel')}</option>}
                {TIMER_STEPS.filter((s) => s > 0).map((step) => (
                  <option key={step} value={step}>{step} {t('settings.timers.minutes')}</option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    </section>
  );
}
