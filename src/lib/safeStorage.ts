class SafeLocalStorage {
  private memoryStore: Record<string, string> = {};

  getItem(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      console.warn(`localStorage.getItem failed for key "${key}", using memory storage fallback:`, e);
      return this.memoryStore[key] || null;
    }
  }

  setItem(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {
      console.warn(`localStorage.setItem failed for key "${key}", using memory storage fallback:`, e);
      this.memoryStore[key] = value;
    }
  }

  removeItem(key: string): void {
    try {
      window.localStorage.removeItem(key);
    } catch (e) {
      console.warn(`localStorage.removeItem failed for key "${key}", using memory storage fallback:`, e);
      delete this.memoryStore[key];
    }
  }

  clear(): void {
    try {
      window.localStorage.clear();
    } catch (e) {
      console.warn("localStorage.clear failed, using memory storage fallback:", e);
      this.memoryStore = {};
    }
  }
}

export const safeLocalStorage = new SafeLocalStorage();
