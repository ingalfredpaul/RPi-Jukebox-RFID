import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../../../stores/settingsStore';
import { usePrefsStore } from '../../../stores/prefsStore';
import { usePubSubStore } from '../../../stores/pubSubStore';
import { request } from '../../../services/request';
import { showToast } from '../../../components/Toast';

interface IdleState {
  enabled: boolean;
  running?: boolean;
  wait_seconds: number;
}

interface KidsConfig {
  resume_default: boolean;
  resume_folders: Record<string, boolean>;
  fade_ms: number;
  unknown_card_sound: boolean;
  second_swipe: string;
}

const IDLE_CHOICES = [0, 5, 10, 15, 30, 60];
const JUMP_CHOICES = [0, 5, 10, 15, 25];

/** "Kinder & Eltern": everything that shapes how the box behaves for children. */
export function KidsSettings() {
  const { t } = useTranslation();
  const softMax = useSettingsStore((s) => s.softMaxVolume);
  const setSoftMax = useSettingsStore((s) => s.setSoftMaxVolume);
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const maxJump = usePrefsStore((s) => s.maxVolumeJump);
  const updatePrefs = usePrefsStore((s) => s.update);
  const kidsbox = usePubSubStore((s) => Boolean(s.pluginsLoaded['kidsbox']));

  const [localMax, setLocalMax] = useState<number | null>(null);
  const [idleMin, setIdleMin] = useState<number | null>(null);
  const [kids, setKids] = useState<KidsConfig | null>(null);

  useEffect(() => {
    void loadSettings();
    void request<IdleState>('timer_idle_shutdown.get_state').then(({ result }) => {
      if (result) setIdleMin(result.enabled ? Math.round(result.wait_seconds / 60) : 0);
    });
  }, [loadSettings]);

  useEffect(() => {
    if (!kidsbox) return;
    void request<KidsConfig>('kidsbox_get_config').then(({ result }) => result && setKids(result));
  }, [kidsbox]);

  const maxShown = localMax ?? softMax;

  const commitMax = async () => {
    if (localMax === null) return;
    const ok = await setSoftMax(localMax);
    setLocalMax(null);
    showToast(ok ? 'success' : 'error', ok ? t('toast.settings-saved') : t('toast.settings-failed'));
  };

  const changeIdle = async (minutes: number) => {
    const { error } =
      minutes === 0
        ? await request('timer_idle_shutdown.cancel')
        : await request('timer_idle_shutdown', { wait_seconds: minutes * 60 });
    if (error) {
      showToast('error', t('toast.settings-failed'));
      return;
    }
    setIdleMin(minutes);
    showToast('success', t('toast.settings-saved'));
  };

  const toggleResumeDefault = async (enabled: boolean) => {
    const { error } = await request('kidsbox_set_resume_default', { enabled });
    if (error) {
      showToast('error', t('toast.settings-failed'));
      return;
    }
    setKids((k) => (k ? { ...k, resume_default: enabled } : k));
    showToast('success', t('toast.settings-saved'));
  };

  return (
    <section className="ui-card">
      <div className="ui-card-title">{t('kids.title')}</div>
      <div className="ui-card-body">
        <div className="ui-field">
          <div className="ui-row">
            <label className="ui-label ui-grow" htmlFor="max-volume">{t('kids.max-volume')}</label>
            <strong>{maxShown}%</strong>
          </div>
          <input
            id="max-volume"
            type="range"
            min={10}
            max={100}
            step={5}
            value={maxShown}
            onChange={(e) => setLocalMax(Number(e.target.value))}
            onPointerUp={() => void commitMax()}
            onKeyUp={() => void commitMax()}
          />
          <span className="ui-hint">{t('kids.max-volume-hint')}</span>
          {maxShown > 80 && <div className="ui-banner ui-banner-warn">{t('kids.max-volume-warn')}</div>}
        </div>

        <div className="ui-field">
          <label className="ui-label" htmlFor="jump">{t('kids.volume-jump')}</label>
          <select id="jump" className="ui-select" value={maxJump} onChange={(e) => updatePrefs({ maxVolumeJump: Number(e.target.value) })}>
            {JUMP_CHOICES.map((v) => (
              <option key={v} value={v}>{v === 0 ? t('kids.unlimited') : t('kids.points', { count: v })}</option>
            ))}
          </select>
          <span className="ui-hint">{t('kids.volume-jump-hint')}</span>
        </div>

        <div className="ui-field">
          <label className="ui-label" htmlFor="idle">{t('kids.idle')}</label>
          <select id="idle" className="ui-select" value={idleMin ?? 0} disabled={idleMin === null} onChange={(e) => void changeIdle(Number(e.target.value))}>
            {IDLE_CHOICES.map((v) => (
              <option key={v} value={v}>{v === 0 ? t('kids.off') : t('kids.minutes', { count: v })}</option>
            ))}
          </select>
          <span className="ui-hint">{t('kids.idle-hint')}</span>
        </div>

        {kidsbox ? (
          <>
            <label className="ui-switch">
              <input
                type="checkbox"
                checked={kids?.resume_default ?? false}
                disabled={!kids}
                onChange={(e) => void toggleResumeDefault(e.target.checked)}
              />
              <span>
                {t('kids.resume-default')}
                <span className="ui-hint" style={{ display: 'block' }}>{t('kids.resume-default-hint')}</span>
              </span>
            </label>
            {kids && (
              <div className="ui-banner">
                <strong>{t('kids.rules-title')}</strong>
                <ul style={{ margin: '8px 0 0', paddingLeft: 16, listStyle: 'disc' }}>
                  <li>{t('kids.rule-same-card')}</li>
                  <li>{kids.fade_ms > 0 ? t('kids.rule-fade', { ms: kids.fade_ms }) : t('kids.rule-nofade')}</li>
                  <li>{kids.unknown_card_sound ? t('kids.rule-unknown-sound') : t('kids.rule-unknown-silent')}</li>
                </ul>
                <p className="ui-hint" style={{ marginTop: 8 }}>{t('kids.rules-config')}</p>
              </div>
            )}
          </>
        ) : (
          <div className="ui-banner ui-banner-warn">{t('kids.no-plugin')}</div>
        )}
      </div>
    </section>
  );
}
