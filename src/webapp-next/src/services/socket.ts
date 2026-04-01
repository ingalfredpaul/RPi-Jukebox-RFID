import * as zmq from 'jszmq';
import { PUBSUB_ENDPOINT, REQRES_ENDPOINT, SUBSCRIPTIONS } from '../config';
import { encodeMessage, decodeMessage, decodePubSubMessage, preparePayload } from './socketUtils';
import type { QueuedRequest } from '../types';
import { generateId } from '../utils/uuid';

type PubSubHandler = (topic: string, data: unknown) => void;

const REQUEST_TIMEOUT = 10_000;
const RECONNECT_BASE_DELAY = 1000;
const RECONNECT_MAX_DELAY = 30_000;

class PhoneboxSocket {
  private static instance: PhoneboxSocket | null = null;

  private subSocket: zmq.Sub | null = null;
  private reqSocket: zmq.Req | null = null;

  private pubSubHandlers: Set<PubSubHandler> = new Set();
  private requestQueue: QueuedRequest[] = [];
  private isProcessing = false;
  private reconnectAttempts = 0;
  private destroyed = false;

  private onConnectionChange: ((connected: boolean) => void) | null = null;

  private constructor() {
    this.initSubSocket();
    this.initReqSocket();
  }

  static getInstance(): PhoneboxSocket {
    if (!PhoneboxSocket.instance) {
      PhoneboxSocket.instance = new PhoneboxSocket();
    }
    return PhoneboxSocket.instance;
  }

  // --- PubSub ---

  private initSubSocket(): void {
    this.subSocket = new zmq.Sub();

    SUBSCRIPTIONS.forEach((topic) => {
      this.subSocket!.subscribe(topic);
    });

    this.subSocket.on('message', (topicBuf: ArrayBuffer, payloadBuf: ArrayBuffer) => {
      const { topic, data, error } = decodePubSubMessage(topicBuf, payloadBuf);

      if (error) {
        console.error(`[PubSub][${topic}]:`, error);
        return;
      }

      this.reconnectAttempts = 0;
      this.onConnectionChange?.(true);

      this.pubSubHandlers.forEach((handler) => handler(topic, data));
    });

    this.subSocket.on('error', (err: unknown) => {
      console.error('[PubSub] Socket error:', err);
      this.handleReconnect('sub');
    });

    try {
      this.subSocket.connect(PUBSUB_ENDPOINT);
      console.log('[PubSub] Connected to', PUBSUB_ENDPOINT);
    } catch (err) {
      console.error('[PubSub] Connection failed:', err);
      this.handleReconnect('sub');
    }
  }

  // --- Request/Response ---

  private initReqSocket(): void {
    this.reqSocket = new zmq.Req();

    this.reqSocket.on('message', (msg: ArrayBuffer) => {
      const response = decodeMessage(msg);
      this.handleResponse(response);
    });

    this.reqSocket.on('error', (err: unknown) => {
      console.error('[Req] Socket error:', err);
      this.rejectCurrentRequest('Socket error');
      this.handleReconnect('req');
    });

    try {
      this.reqSocket.connect(REQRES_ENDPOINT);
      console.log('[Req] Connected to', REQRES_ENDPOINT);
    } catch (err) {
      console.error('[Req] Connection failed:', err);
    }
  }

  private handleResponse(response: { id?: string; result?: unknown; error?: { message: string } }): void {
    if (this.requestQueue.length === 0) return;

    const current = this.requestQueue[0];

    if (current && response.id && response.id === current.payload.id) {
      clearTimeout(current.timeoutId);
      this.requestQueue.shift();
      this.isProcessing = false;

      if (response.error?.message) {
        current.reject(response.error.message);
      } else {
        current.resolve(response.result);
      }

      this.processQueue();
    }
  }

  private rejectCurrentRequest(reason: string): void {
    if (this.requestQueue.length > 0 && this.isProcessing) {
      const current = this.requestQueue.shift();
      if (!current) return;
      clearTimeout(current.timeoutId);
      this.isProcessing = false;
      current.reject(reason);
      this.processQueue();
    }
  }

  private processQueue(): void {
    if (this.isProcessing || this.requestQueue.length === 0 || !this.reqSocket) return;

    this.isProcessing = true;
    const request = this.requestQueue[0];
    if (!request) return;

    try {
      this.reqSocket.send(encodeMessage(request.payload));
    } catch (err) {
      this.rejectCurrentRequest(`Send failed: ${err}`);
    }
  }

  // --- Reconnect ---

  private handleReconnect(socketType: 'sub' | 'req'): void {
    if (this.destroyed) return;

    this.onConnectionChange?.(false);
    this.reconnectAttempts++;

    const delay = Math.min(
      RECONNECT_BASE_DELAY * Math.pow(2, this.reconnectAttempts - 1),
      RECONNECT_MAX_DELAY,
    );

    console.log(`[${socketType}] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      if (this.destroyed) return;

      if (socketType === 'sub') {
        this.subSocket?.close();
        this.initSubSocket();
      } else {
        this.reqSocket?.close();
        this.initReqSocket();
        this.processQueue();
      }
    }, delay);
  }

  // --- Public API ---

  onPubSub(handler: PubSubHandler): () => void {
    this.pubSubHandlers.add(handler);
    return () => {
      this.pubSubHandlers.delete(handler);
    };
  }

  setConnectionChangeHandler(handler: (connected: boolean) => void): void {
    this.onConnectionChange = handler;
  }

  request(
    pkg: string,
    plugin: string,
    method: string | null,
    kwargs: Record<string, unknown> = {},
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const requestId = generateId();
      const payload = preparePayload(requestId, pkg, plugin, method, kwargs);

      const timeoutId = setTimeout(() => {
        const index = this.requestQueue.findIndex((r) => r.payload.id === requestId);
        if (index !== -1) {
          const req = this.requestQueue.splice(index, 1)[0];
          if (this.isProcessing && index === 0) {
            this.isProcessing = false;
          }
          req?.reject(`Request timeout after ${REQUEST_TIMEOUT}ms: ${pkg}.${plugin}.${method}`);
          this.processQueue();
        }
      }, REQUEST_TIMEOUT);

      this.requestQueue.push({ payload, resolve, reject, timeoutId });
      this.processQueue();
    });
  }

  cleanup(): void {
    this.destroyed = true;

    this.requestQueue.forEach((req) => {
      clearTimeout(req.timeoutId);
      req.reject('Socket destroyed');
    });
    this.requestQueue = [];
    this.isProcessing = false;
    this.pubSubHandlers.clear();

    this.subSocket?.close();
    this.reqSocket?.close();
    this.subSocket = null;
    this.reqSocket = null;

    PhoneboxSocket.instance = null;
  }
}

export const getSocket = () => PhoneboxSocket.getInstance();
