export interface RpcRequest {
  id: string;
  package: string;
  plugin: string;
  method: string | null;
  kwargs: Record<string, unknown>;
}

export interface RpcResponse {
  id: string;
  result?: unknown;
  error?: {
    message: string;
  };
}

export interface PubSubMessage {
  topic: string;
  data: unknown;
}

export interface QueuedRequest {
  payload: RpcRequest;
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
  timeoutId: ReturnType<typeof setTimeout>;
}
