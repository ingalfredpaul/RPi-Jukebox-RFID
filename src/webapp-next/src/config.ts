/**
 * Host of the Jukebox daemon. Normally the page is served by the box itself, so
 * `window.location.hostname` is right. For development on a PC you can point
 * the app at a real box with `localStorage.setItem('pb.box-host', '192.168.x.y')`.
 */
function resolveHost(): string {
  try {
    const override = window.localStorage.getItem('pb.box-host');
    if (override) return override;
  } catch {
    /* storage unavailable (private mode) */
  }
  return window.location.hostname === 'localhost' ? '0.0.0.0' : window.location.hostname;
}

const HOST = resolveHost();

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

/** Sleep timer choices on the player page, in minutes. */
export const SLEEP_STEPS = [5, 10, 15, 20, 30, 45, 60] as const;

/** Extensions the upload service accepts (mirror of deploy/upload-service). */
export const UPLOAD_EXTENSIONS = [
  'mp3', 'm4a', 'm4b', 'ogg', 'opus', 'flac', 'wav', 'jpg', 'jpeg', 'png',
] as const;
