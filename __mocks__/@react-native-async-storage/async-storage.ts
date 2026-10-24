// In-memory AsyncStorage for tests (v3 of the library ships no jest mock).
let store = new Map<string, string>();

const AsyncStorage = {
  getItem: async (key: string) => store.get(key) ?? null,
  setItem: async (key: string, value: string) => {
    store.set(key, value);
  },
  removeItem: async (key: string) => {
    store.delete(key);
  },
  removeMany: async (keys: string[]) => {
    keys.forEach((k) => store.delete(k));
  },
  clear: async () => {
    store = new Map();
  },
};

export default AsyncStorage;
