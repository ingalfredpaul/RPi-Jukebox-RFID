import type { RpcRequest, RpcResponse } from '../types';

export function encodeMessage(obj: RpcRequest): string {
  return JSON.stringify(obj);
}

export function decodeMessage(msg: ArrayBuffer): RpcResponse {
  const decoded = JSON.parse(new TextDecoder().decode(msg));
  return {
    id: decoded.id,
    result: decoded.result,
    error: decoded.error,
  };
}

export function decodePubSubMessage(
  topicBuf: ArrayBuffer,
  payloadBuf: ArrayBuffer,
): { topic: string; data?: unknown; error?: string } {
  const topic = new TextDecoder().decode(topicBuf);
  const payload = new TextDecoder().decode(payloadBuf);

  try {
    const data: unknown = JSON.parse(payload);
    return { topic, data };
  } catch {
    return { topic, error: `Failed to parse payload for topic: ${topic}` };
  }
}

export function preparePayload(
  requestId: string,
  pkg: string,
  plugin: string,
  method: string | null,
  kwargs: Record<string, unknown> = {},
): RpcRequest {
  return {
    id: requestId,
    package: pkg,
    plugin,
    method,
    kwargs,
  };
}
