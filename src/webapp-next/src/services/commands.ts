interface CommandDefinition {
  package: string;
  plugin: string;
  method: string | null;
}

const COMMANDS: Record<string, CommandDefinition> = {
  // Player
  playerstatus: { package: 'player', plugin: 'ctrl', method: 'playerstatus' },
  play: { package: 'player', plugin: 'ctrl', method: 'play' },
  pause: { package: 'player', plugin: 'ctrl', method: 'pause' },
  toggle: { package: 'player', plugin: 'ctrl', method: 'toggle' },
  play_single: { package: 'player', plugin: 'ctrl', method: 'play_single' },
  play_album: { package: 'player', plugin: 'ctrl', method: 'play_album' },
  play_folder: { package: 'player', plugin: 'ctrl', method: 'play_folder' },
  prev_song: { package: 'player', plugin: 'ctrl', method: 'prev' },
  next_song: { package: 'player', plugin: 'ctrl', method: 'next' },
  seek: { package: 'player', plugin: 'ctrl', method: 'seek' },
  shuffle: { package: 'player', plugin: 'ctrl', method: 'shuffle' },
  repeat: { package: 'player', plugin: 'ctrl', method: 'repeat' },
  getSingleCoverArt: { package: 'player', plugin: 'ctrl', method: 'get_single_coverart' },
  getAlbumCoverArt: { package: 'player', plugin: 'ctrl', method: 'get_album_coverart' },

  // Volume
  setVolume: { package: 'volume', plugin: 'ctrl', method: 'set_volume' },
  getVolume: { package: 'volume', plugin: 'ctrl', method: 'get_volume' },
  getMaxVolume: { package: 'volume', plugin: 'ctrl', method: 'get_soft_max_volume' },
  setMaxVolume: { package: 'volume', plugin: 'ctrl', method: 'set_soft_max_volume' },
  change_volume: { package: 'volume', plugin: 'ctrl', method: 'change_volume' },
  toggleMuteVolume: { package: 'volume', plugin: 'ctrl', method: 'mute' },
  getAudioOutputs: { package: 'volume', plugin: 'ctrl', method: 'get_outputs' },
  setAudioOutput: { package: 'volume', plugin: 'ctrl', method: 'set_output' },
  toggle_output: { package: 'volume', plugin: 'ctrl', method: 'toggle_output' },

  // Library
  directoryTreeOfAudiofolder: { package: 'player', plugin: 'ctrl', method: 'list_all_dirs' },
  albumList: { package: 'player', plugin: 'ctrl', method: 'list_albums' },
  songList: { package: 'player', plugin: 'ctrl', method: 'list_songs_by_artist_and_album' },
  getSongByUrl: { package: 'player', plugin: 'ctrl', method: 'get_song_by_url' },
  folderList: { package: 'player', plugin: 'ctrl', method: 'get_folder_content' },

  // Cards - no method, plugin IS the action
  cardsList: { package: 'cards', plugin: 'list_cards', method: null },
  registerCard: { package: 'cards', plugin: 'register_card', method: null },
  deleteCard: { package: 'cards', plugin: 'delete_card', method: null },

  // Timers
  timer_shutdown: { package: 'timers', plugin: 'timer_shutdown', method: 'start' },
  'timer_shutdown.cancel': { package: 'timers', plugin: 'timer_shutdown', method: 'cancel' },
  'timer_shutdown.get_state': { package: 'timers', plugin: 'timer_shutdown', method: 'get_state' },
  timer_stop_player: { package: 'timers', plugin: 'timer_stop_player', method: 'start' },
  'timer_stop_player.cancel': { package: 'timers', plugin: 'timer_stop_player', method: 'cancel' },
  'timer_stop_player.get_state': { package: 'timers', plugin: 'timer_stop_player', method: 'get_state' },
  timer_fade_volume: { package: 'timers', plugin: 'timer_fade_volume', method: 'start' },
  'timer_fade_volume.cancel': { package: 'timers', plugin: 'timer_fade_volume', method: 'cancel' },
  'timer_fade_volume.get_state': { package: 'timers', plugin: 'timer_fade_volume', method: 'get_state' },
  timer_idle_shutdown: { package: 'timers', plugin: 'timer_idle_shutdown', method: 'start' },
  'timer_idle_shutdown.cancel': { package: 'timers', plugin: 'timer_idle_shutdown', method: 'cancel' },
  'timer_idle_shutdown.get_state': { package: 'timers', plugin: 'timer_idle_shutdown', method: 'get_state' },

  // Host - no method, plugin IS the action
  getAutohotspotStatus: { package: 'host', plugin: 'get_autohotspot_status', method: null },
  startAutohotspot: { package: 'host', plugin: 'start_autohotspot', method: null },
  stopAutohotspot: { package: 'host', plugin: 'stop_autohotspot', method: null },
  getIpAddress: { package: 'host', plugin: 'get_ip_address', method: null },
  getDiskUsage: { package: 'host', plugin: 'get_disk_usage', method: null },
  reboot: { package: 'host', plugin: 'reboot', method: null },
  shutdown: { package: 'host', plugin: 'shutdown', method: null },
  say_my_ip: { package: 'host', plugin: 'say_my_ip', method: null },

  // App Settings - no method, plugin IS the action
  getAppSettings: { package: 'misc', plugin: 'get_app_settings', method: null },
  setAppSettings: { package: 'misc', plugin: 'set_app_settings', method: null },

  // Sync
  sync_rfidcards_all: { package: 'sync_rfidcards', plugin: 'ctrl', method: 'sync_all' },
  sync_rfidcards_change_on_rfid_scan: { package: 'sync_rfidcards', plugin: 'ctrl', method: 'sync_change_on_rfid_scan' },
};

export type CommandName = keyof typeof COMMANDS;

export function getCommand(name: CommandName): CommandDefinition {
  const cmd = COMMANDS[name];
  if (!cmd) {
    throw new Error(`Unknown command: ${name}`);
  }
  return cmd;
}

export { COMMANDS };
