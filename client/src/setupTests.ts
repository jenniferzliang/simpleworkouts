// Jest's jsdom environment lacks the Web Crypto API that uuid requires
import { webcrypto } from 'crypto';

if (!globalThis.crypto || !('getRandomValues' in globalThis.crypto)) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto });
}

export {};
