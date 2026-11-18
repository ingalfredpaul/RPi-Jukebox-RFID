import '@testing-library/jest-dom';

// Newer Node versions ship an experimental global `localStorage` that shadows jsdom's and is
// unusable without a flag. Provide a tiny in-memory Storage so tests behave the same everywhere.
function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() { return map.size; },
    clear: () => map.clear(),
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    key: (i) => [...map.keys()][i] ?? null,
    removeItem: (k) => void map.delete(k),
    setItem: (k, v) => void map.set(k, String(v)),
  };
}
for (const name of ['localStorage', 'sessionStorage'] as const) {
  Object.defineProperty(window, name, { value: memoryStorage(), configurable: true });
  Object.defineProperty(globalThis, name, { value: window[name], configurable: true });
}
