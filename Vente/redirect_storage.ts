export interface RedirectStore {
  pendingRedirect: string | null;
  setPendingRedirect(path: string): void;
  getPendingRedirect(): string | null;
  resetPendingRedirect(): void;
}

export const redirectStore: RedirectStore = {
  pendingRedirect: null,
  setPendingRedirect(path: string): void {
    this.pendingRedirect = path;
  },
  getPendingRedirect(): string | null {
    return this.pendingRedirect;
  },
  resetPendingRedirect() {
    this.pendingRedirect = null;
  }
};