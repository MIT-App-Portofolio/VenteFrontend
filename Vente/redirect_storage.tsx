import { useRouter, usePathname, useRootNavigationState } from 'expo-router';
import React, { useEffect } from 'react';
import { create } from 'zustand';

export const useRedirectStore = create<{
  pendingRedirect: string | null;
  setRedirect: (path: string) => void;
  clearRedirect: () => void;
}>((set) => ({
  pendingRedirect: null,
  setRedirect: (path) => set({ pendingRedirect: path }),
  clearRedirect: () => set({ pendingRedirect: null }),
}));

export function RedirectHandler({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { pendingRedirect, clearRedirect } = useRedirectStore();
  const rootNavigationState = useRootNavigationState()

  useEffect(() => {
    if (!pendingRedirect) return;
    if (!rootNavigationState?.key) return;
    router.push(pendingRedirect);
    if (pendingRedirect === pathname) {
      clearRedirect();
      return;
    }
    clearRedirect();
  }, [pendingRedirect, pathname, rootNavigationState]);

  return <>{children}</>;
}