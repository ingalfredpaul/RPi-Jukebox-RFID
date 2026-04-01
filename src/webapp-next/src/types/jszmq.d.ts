declare module 'jszmq' {
  export class Sub {
    subscribe(topic: string): void;
    connect(endpoint: string): void;
    close(): void;
    on(event: 'message', callback: (...args: ArrayBuffer[]) => void): void;
    on(event: 'error', callback: (err: unknown) => void): void;
  }

  export class Req {
    connect(endpoint: string): void;
    close(): void;
    send(data: string): void;
    on(event: 'message', callback: (msg: ArrayBuffer) => void): void;
    on(event: 'error', callback: (err: unknown) => void): void;
    onerror: ((err: unknown) => void) | null;
  }
}
