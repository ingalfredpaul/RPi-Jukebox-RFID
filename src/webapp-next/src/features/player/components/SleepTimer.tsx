import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '../../../components/Dialog';
import { showToast } from '../../../components/Toast';
import { request } from '../../../services/request';
import { SLEEP_STEPS } from '../../../config';
import type { CommandName } from '../../../services/commands';
import styles from '../player.module.css';

interface TimerState {
  enabled: boolean;
  remaining_seconds: number;
}

type Mode = 'stop' | 'fade';

/** Kid-friendly sleep timer: "stop the music in N minutes" or "fade out and switch the box off". */
const MODES: Record<Mode, { start: CommandName; cancel: CommandName; state: CommandName; min: number }> = {
  stop: { start: 'timer_stop_player', cancel: 'timer_stop_player.cancel', state: 'timer_stop_player.get_state', min: 1 },
  // The fade-out timer needs at least 2 minutes (it fades during the last two).
  fade: { start: 'timer_fade_volume', cancel: 'timer_fade_volume.cancel', state: 'timer_fade_volume.get_state', min: 5 },
};

export function SleepTimer() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('stop');
  const [states, setStates] = useState<Record<Mode, TimerState | null>>({ stop: null, fade: null });

  const refresh = useCallback(async () => {
    const [stop, fade] = await Promise.all([
      request<TimerState>(MODES.stop.state),
      request<TimerState>(MODES.fade.state),
    ]);
    setStates({ stop: stop.result ?? null, fade: fade.result ?? null });
  }, []);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), open ? 5000 : 20000);
    return () => clearInterval(id);
  }, [refresh, open]);

  const active = (['stop', 'fade'] as Mode[]).find((m) => states[m]?.enabled);
  const remainingMin = active ? Math.max(1, Math.ceil((states[active]?.remaining_seconds ?? 0) / 60)) : 0;

  const start = async (minutes: number) => {
    const { error } = await request(MODES[mode].start, { wait_seconds: minutes * 60 });
    if (error) showToast('error', t('player.sleep.error'));
    else showToast('success', t('player.sleep.started', { minutes }));
    setOpen(false);
    void refresh();
  };

  const cancel = async () => {
    await Promise.all(
      (['stop', 'fade'] as Mode[]).filter((m) => states[m]?.enabled).map((m) => request(MODES[m].cancel)),
    );
    showToast('info', t('player.sleep.canceled'));
    setOpen(false);
    void refresh();
  };

  return (
    <>
      <div className={styles.sleepRow}>
        <button
          className={`${styles.sleepBtn} ${active ? styles.sleepActive : ''}`}
          onClick={() => setOpen(true)}
        >
          <span aria-hidden="true">🌙</span>
          {active ? t('player.sleep.running', { minutes: remainingMin }) : t('player.sleep.button')}
        </button>
      </div>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={t('player.sleep.title')}
        actions={
          <>
            {active && (
              <button className="ui-btn ui-btn-danger" onClick={cancel}>{t('player.sleep.cancel')}</button>
            )}
            <button className="ui-btn" onClick={() => setOpen(false)}>{t('general.buttons.close')}</button>
          </>
        }
      >
        <div className={styles.sleepMode}>
          <label className="ui-switch">
            <input type="radio" name="sleepmode" checked={mode === 'stop'} onChange={() => setMode('stop')} />
            <span>{t('player.sleep.mode-stop')}</span>
          </label>
          <label className="ui-switch">
            <input type="radio" name="sleepmode" checked={mode === 'fade'} onChange={() => setMode('fade')} />
            <span>{t('player.sleep.mode-fade')}</span>
          </label>
        </div>
        <div className={styles.sleepGrid}>
          {SLEEP_STEPS.filter((m) => m >= MODES[mode].min).map((m) => (
            <button key={m} className={styles.sleepChoice} onClick={() => start(m)}>
              {m} {t('player.sleep.min')}
            </button>
          ))}
        </div>
      </Dialog>
    </>
  );
}
