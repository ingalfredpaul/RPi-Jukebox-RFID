export interface AppSettings {
  show_covers: boolean;
}

export interface AudioOutput {
  alias: string;
  sink_name: string;
  is_default: boolean;
}

export interface TimerState {
  enabled: boolean;
  remaining: number;
  wait_seconds: number;
}

export interface SystemStatus {
  cpu_temp: number | null;
  disk_usage: number | null;
  ip_address: string | null;
  version: string | null;
  started_at: string | null;
}
