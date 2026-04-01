import { describe, it, expect } from 'vitest';
import { getCommand, COMMANDS } from '../commands';

describe('commands', () => {
  it('should return command definition for valid command', () => {
    const cmd = getCommand('play');
    expect(cmd.package).toBe('player');
    expect(cmd.plugin).toBe('ctrl');
    expect(cmd.method).toBe('play');
  });

  it('should return correct volume command', () => {
    const cmd = getCommand('setVolume');
    expect(cmd.package).toBe('volume');
    expect(cmd.plugin).toBe('ctrl');
    expect(cmd.method).toBe('set_volume');
  });

  it('should throw for unknown command', () => {
    expect(() => getCommand('nonexistent' as any)).toThrow('Unknown command');
  });

  it('should have all critical commands defined', () => {
    const criticalCommands = [
      'play', 'pause', 'toggle', 'next_song', 'prev_song',
      'setVolume', 'getVolume', 'cardsList', 'albumList',
      'reboot', 'shutdown',
    ];

    for (const cmd of criticalCommands) {
      expect(COMMANDS[cmd]).toBeDefined();
    }
  });
});
