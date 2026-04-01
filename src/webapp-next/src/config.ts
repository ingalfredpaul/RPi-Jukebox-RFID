const HOST = window.location.hostname === 'localhost'
  ? '0.0.0.0'
  : window.location.hostname;

export const REQRES_ENDPOINT = `ws://${HOST}:5556`;
export const PUBSUB_ENDPOINT = `ws://${HOST}:5557`;

export const SUBSCRIPTIONS = [
  'batt_status',
  'core.plugins.loaded',
  'core.version',
  'core.started_at',
  'host.temperature.cpu',
  'playerstatus',
  'rfid.card_id',
  'volume.level',
] as const;

export type SubscriptionTopic = typeof SUBSCRIPTIONS[number];

export const TIMER_STEPS = [0, 2, 5, 10, 15, 20, 30, 45, 60, 120, 180, 240] as const;

export const JUKEBOX_ACTIONS_MAP = {
  play_music: {
    commands: ['play_album', 'play_folder', 'play_single'] as const,
  },
  audio: {
    commands: ['change_volume', 'toggle_output', 'play', 'pause', 'toggle', 'next_song', 'prev_song', 'shuffle', 'repeat'] as const,
  },
  host: {
    commands: ['shutdown', 'reboot', 'say_my_ip'] as const,
  },
  timers: {
    commands: ['timer_shutdown', 'timer_stop_player', 'timer_fade_volume'] as const,
  },
  spotify: {
    commands: ['play_spotify_playlist', 'play_spotify_album', 'play_spotify_track'] as const,
  },
  radio: {
    commands: ['play_radio_station', 'play_podcast'] as const,
  },
} as const;
