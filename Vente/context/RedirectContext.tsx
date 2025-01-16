import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'expo-router';

interface RedirectContextType {
  setRedirectTo: React.Dispatch<React.SetStateAction<string | null>>;
}

const RedirectContext = createContext<RedirectContextType | null>(null);

export const RedirectProvider = ({ children }: { children: React.ReactNode }) => {
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    if (redirectTo) {
      router.push(redirectTo as any);
    }
  }, [redirectTo, router]);

  return (
    <RedirectContext.Provider value={{ setRedirectTo }}>
      {children}
    </RedirectContext.Provider>
  );
};

export const useRedirect = () => useContext(RedirectContext);
