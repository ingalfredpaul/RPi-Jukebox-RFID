import type { TFunction } from 'i18next';

/** One entry of `cards.list_cards` (see src/jukebox/components/rfid/cards/__init__.py). */
export interface CardEntry {
  func: string;
  description: string;
  from_alias?: string;
  action: {
    package: string;
    plugin: string;
    method: string | null;
    args?: unknown;
    kwargs?: Record<string, unknown> | null;
  };
}

export type CardsMap = Record<string, CardEntry>;

/**
 * Special cards: one card = one action. The alias must exist in
 * `cmd_alias_definitions` (src/jukebox/components/rpc_command_alias.py).
 */
export interface SpecialAction {
  key: string;
  alias: string;
  args?: unknown[];
  icon: string;
}

export const SPECIAL_ACTIONS: SpecialAction[] = [
  { key: 'volume-up', alias: 'change_volume', args: [5], icon: '🔊' },
  { key: 'volume-down', alias: 'change_volume', args: [-5], icon: '🔉' },
  { key: 'pause', alias: 'pause', icon: '⏸' },
  { key: 'toggle', alias: 'toggle', icon: '⏯' },
  { key: 'next', alias: 'next_song', icon: '⏭' },
  { key: 'prev', alias: 'prev_song', icon: '⏮' },
  { key: 'sleep-30', alias: 'timer_fade_volume', args: [1800], icon: '🌙' },
  { key: 'sleep-15', alias: 'timer_fade_volume', args: [900], icon: '😴' },
  { key: 'stop-30', alias: 'timer_stop_player', args: [1800], icon: '⏹' },
  { key: 'shutdown', alias: 'shutdown', icon: '⏻' },
];

const FOLDER_ALIASES = new Set(['play_card', 'play_folder', 'play_card_kids']);

function firstArg(args: unknown): unknown {
  if (Array.isArray(args)) return args[0];
  return args;
}

export function folderOfCard(entry: CardEntry): string | null {
  const alias = entry.from_alias;
  const plugin = entry.action.plugin;
  if ((alias && FOLDER_ALIASES.has(alias)) || plugin === 'play_card' || entry.action.method === 'play_folder' || entry.action.method === 'play_card') {
    const arg = firstArg(entry.action.args) ?? entry.action.kwargs?.folder;
    return typeof arg === 'string' ? arg : null;
  }
  return null;
}

export function matchSpecial(entry: CardEntry): SpecialAction | undefined {
  const args = Array.isArray(entry.action.args) ? entry.action.args : [];
  return SPECIAL_ACTIONS.find(
    (s) =>
      s.alias === entry.from_alias &&
      JSON.stringify(s.args ?? []) === JSON.stringify(args),
  ) ?? SPECIAL_ACTIONS.find((s) => s.alias === entry.from_alias && !s.args);
}

/** Human readable one-liner for a card, e.g. "Spielt: Pumuckl/Folge 1" or "Lauter". */
export function describeCard(entry: CardEntry, t: TFunction): { icon: string; text: string } {
  const folder = folderOfCard(entry);
  if (folder !== null) return { icon: '📁', text: t('cards.describe.folder', { folder }) };
  const special = matchSpecial(entry);
  if (special) return { icon: special.icon, text: t(`cards.special.${special.key.replace(/-/g, "")}`) };
  return { icon: '⚙', text: entry.func || entry.from_alias || '–' };
}
