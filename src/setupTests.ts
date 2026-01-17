// src/setupTests.ts
import '@testing-library/jest-dom';

// Mock localStorage for JSDOM environment
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};

  return {
    getItem(key: string) {
      return store[key] || null;
    },
    setItem(key: string, value: string) {
      store[key] = value.toString();
    },
    removeItem(key: string) {
      delete store[key];
    },
    clear() {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock scrollIntoView, as it's not implemented in JSDOM
window.HTMLElement.prototype.scrollIntoView = () => undefined;
