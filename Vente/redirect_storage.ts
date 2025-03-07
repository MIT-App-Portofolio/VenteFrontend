export interface RedirectStore {
  pendingRedirect: string | null;
  setPendingRedirect(path: string): void;
  getPendingRedirect(): string | null;
}

export const redirectStore: RedirectStore = {
  pendingRedirect: null,
  setPendingRedirect(path: string): void {
    this.pendingRedirect = path;
  },
  getPendingRedirect(): string | null {
    const redirect = this.pendingRedirect;
    this.pendingRedirect = null; // Clear after getting
    return redirect;
  }
};