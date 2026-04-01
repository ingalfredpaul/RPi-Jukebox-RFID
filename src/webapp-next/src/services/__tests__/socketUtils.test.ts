import { describe, it, expect } from 'vitest';
import { encodeMessage, decodeMessage, preparePayload } from '../socketUtils';

describe('socketUtils', () => {
  describe('encodeMessage', () => {
    it('should encode RPC request to JSON string', () => {
      const payload = preparePayload('test-id', 'player', 'ctrl', 'play', {});
      const encoded = encodeMessage(payload);
      const parsed = JSON.parse(encoded);

      expect(parsed.id).toBe('test-id');
      expect(parsed.package).toBe('player');
      expect(parsed.plugin).toBe('ctrl');
      expect(parsed.method).toBe('play');
    });
  });

  describe('decodeMessage', () => {
    it('should decode ArrayBuffer to RPC response', () => {
      const response = { id: 'test-id', result: 'ok', error: undefined };
      const buffer = new TextEncoder().encode(JSON.stringify(response));
      const decoded = decodeMessage(buffer.buffer);

      expect(decoded.id).toBe('test-id');
      expect(decoded.result).toBe('ok');
      expect(decoded.error).toBeUndefined();
    });

    it('should decode error responses', () => {
      const response = { id: 'test-id', error: { message: 'Something failed' } };
      const buffer = new TextEncoder().encode(JSON.stringify(response));
      const decoded = decodeMessage(buffer.buffer);

      expect(decoded.error?.message).toBe('Something failed');
    });
  });

  describe('preparePayload', () => {
    it('should create correct RPC payload', () => {
      const payload = preparePayload('id-1', 'volume', 'ctrl', 'set_volume', { volume: 50 });

      expect(payload).toEqual({
        id: 'id-1',
        package: 'volume',
        plugin: 'ctrl',
        method: 'set_volume',
        kwargs: { volume: 50 },
      });
    });

    it('should default kwargs to empty object', () => {
      const payload = preparePayload('id-2', 'player', 'ctrl', 'play');
      expect(payload.kwargs).toEqual({});
    });
  });
});
