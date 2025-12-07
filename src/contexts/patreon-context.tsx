'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { usePatreonStore } from '@/stores/patreon-store';
import { useEffect } from 'react';

interface PatreonContextType {
  supporters: Set<string>;
  isLoading: boolean;
}

const PatreonContext = createContext<PatreonContextType | undefined>(undefined);

interface PatreonProviderProps {
  children: ReactNode;
}

export function PatreonProvider({ children }: PatreonProviderProps) {
  const { supporters, isLoading, fetchSupporters } = usePatreonStore();

  useEffect(() => {
    fetchSupporters();
  }, []);

  return (
    <PatreonContext.Provider value={{ supporters, isLoading }}>
      {children}
    </PatreonContext.Provider>
  );
}

export function usePatreonContext() {
  const context = useContext(PatreonContext);
  if (context === undefined) {
    throw new Error('usePatreonContext must be used within a PatreonProvider');
  }
  return context;
}
