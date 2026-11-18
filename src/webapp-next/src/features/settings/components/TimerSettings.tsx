import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { request } from '../../../services/request';
import type { CommandName } from '../../../services/commands';
import { TIMER_STEPS } from '../../../config';

interface TimerConfig {
  key: string;
  start: CommandName;
  cancel: CommandName;
  state: CommandName;
}

interface TimerState {
  enabled: boolean;
  remaining_seconds?: number;
}

const TIMERS: TimerConfig[] = [
  { key: 'shutdown', start: 'timer_shutdown', cancel: 'timer_shutdown.cancel', state: 'timer_shutdown.get_state' },
  { key: 'stop-player', start: 'timer_stop_player', cancel: 'timer_stop_player.cancel', state: 'timer_stop_player.get_state' },
  { key: 'fade-volume', start: 'timer_fade_volume', cancel: 'timer_fade_volume.cancel', state: 'timer_fade_volume.get_state' },
];

export function TimerSettings() {
  const { t } = useTranslation();
  const [states, setStates] = useState<Record<string, TimerState>>({});

  const load = useCallback(async () => {
    for (const timer of TIMERS) {
      const { result } = await request<TimerState>(timer.state);
      if (result) setStates((prev) => ({ ...prev, [timer.key]: result }));
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 10000);
    return () => clearInterval(id);
  }, [load]);

  const set = async (timer: TimerConfig, minutes: number) => {
    if (minutes === 0) await request(timer.cancel);
    else await request(timer.start, { wait_seconds: minutes * 60 });
    void load();
  };

  return (
    <section className="ui-card">
      <div className="ui-card-title">{t('settings.timers.title')}</div>
      <div className="ui-card-body">
        {TIMERS.map((timer) => {
          const state = states[timer.key];
          const active = state?.enabled;
          const remaining = state?.remaining_seconds ? Math.ceil(state.remaining_seconds / 60) : 0;
          return (
            <div key={timer.key} className="ui-field">
              <label className="ui-label" htmlFor={`timer-${timer.key}`}>
                {t(`settings.timers.${timer.key.replace(/-/g, "")}`)}
                {' · '}
                <strong>{active ? t('settings.timers.remaining', { minutes: remaining }) : t('settings.timers.inactive')}</strong>
              </label>
              <select
                id={`timer-${timer.key}`}
                className="ui-select"
                value=""
                onChange={(e) => void set(timer, Number(e.target.value))}
              >
                <option value="" disabled>{active ? t('settings.timers.change') : t('settings.timers.settimer')}</option>
                {active && <option value="0">{t('settings.timers.cancel')}</option>}
                {TIMER_STEPS.filter((s) => s >= (timer.key === 'fade-volume' ? 5 : 1)).map((step) => (
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
