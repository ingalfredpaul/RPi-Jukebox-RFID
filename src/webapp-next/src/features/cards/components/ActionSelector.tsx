import { useTranslation } from 'react-i18next';
import styles from '../cards.module.css';

const ACTIONS: Record<string, string[]> = {
  play_music: ['play_album', 'play_folder', 'play_single'],
  audio: ['change_volume', 'toggle_output', 'play', 'pause', 'toggle', 'next_song', 'prev_song', 'shuffle', 'repeat'],
  host: ['shutdown', 'reboot', 'say_my_ip'],
  timers: ['timer_shutdown', 'timer_stop_player', 'timer_fade_volume'],
  spotify: ['play_spotify_playlist', 'play_spotify_album', 'play_spotify_track'],
  radio: ['play_radio_station', 'play_podcast'],
};

interface ActionSelectorProps {
  actionAlias: string;
  onActionChange: (alias: string) => void;
  command: string;
  onCommandChange: (cmd: string) => void;
  commandValue: Record<string, unknown>;
  onValueChange: (value: Record<string, unknown>) => void;
}

export function ActionSelector({
  actionAlias,
  onActionChange,
  command,
  onCommandChange,
}: ActionSelectorProps) {
  const { t } = useTranslation();

  const commands = actionAlias ? ACTIONS[actionAlias] || [] : [];

  return (
    <div className={styles.selectorContainer}>
      <div className={styles.formField}>
        <label className={styles.label}>{t('cards.form.action-type')}</label>
        <select
          className={styles.select}
          value={actionAlias}
          onChange={(e) => {
            onActionChange(e.target.value);
            onCommandChange('');
          }}
        >
          <option value="">{t('cards.form.select-action')}</option>
          {Object.keys(ACTIONS).map((key) => (
            <option key={key} value={key}>
              {t(`cards.actions.${key}`)}
            </option>
          ))}
        </select>
      </div>

      {actionAlias && (
        <div className={styles.formField}>
          <label className={styles.label}>{t('cards.form.select-action')}</label>
          <select
            className={styles.select}
            value={command}
            onChange={(e) => onCommandChange(e.target.value)}
          >
            <option value="">–</option>
            {commands.map((cmd) => (
              <option key={cmd} value={cmd}>
                {t(`cards.commands.${cmd}`)}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
