// Vitest setup — runs before each test file
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, vi } from "vitest";

// Initialize Pinia globally
setActivePinia(createPinia());

// ── Mock localStorage (shared, resets in beforeEach) ──────────────────────────
let _store = {};
const localStorageMock = {
  getItem: (key) => _store[key] ?? null,
  setItem: (key, value) => {
    _store[key] = String(value);
  },
  removeItem: (key) => {
    delete _store[key];
  },
  clear: () => {
    _store = {};
  },
  get length() {
    return Object.keys(_store).length;
  },
  key: (i) => Object.keys(_store)[i] ?? null,
};
if (typeof window !== "undefined") {
  Object.defineProperty(window, "localStorage", {
    value: localStorageMock,
    writable: true,
  });
}

beforeEach(() => {
  setActivePinia(createPinia()); // Fresh pinia per test
  _store = {}; // Reset localStorage backing store
});

// ── Mock Quasar Notify (not available in test env) ────────────────────────────
vi.mock("quasar", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    Notify: {
      create: vi.fn(),
      setDefaults: vi.fn(),
      registerType: vi.fn(),
    },
    Dialog: {
      create: vi.fn().mockReturnValue({
        onOk: vi.fn(),
        onCancel: vi.fn(),
        onDismiss: vi.fn(),
      }),
    },
    Loading: {
      show: vi.fn(),
      hide: vi.fn(),
    },
    LocalStorage: {
      getItem: (key) => _store[key] ?? null,
      setItem: (key, value) => {
        _store[key] = String(value);
      },
      removeItem: (key) => {
        delete _store[key];
      },
      clear: () => {
        _store = {};
      },
    },
  };
});
