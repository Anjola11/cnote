import React, { createContext, useContext, useState, useCallback } from 'react';
import CnoteLoader from '../components/ui/CnoteLoader';

interface LoaderContextType {
  setIsLoading: (loading: boolean) => void;
}

const LoaderContext = createContext<LoaderContextType | undefined>(undefined);

export function LoaderProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);

  const setGlobalLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  return (
    <LoaderContext.Provider value={{ setIsLoading: setGlobalLoading }}>
      {children}
      {isLoading && <CnoteLoader />}
    </LoaderContext.Provider>
  );
}

export function useLoader() {
  const context = useContext(LoaderContext);
  if (context === undefined) {
    throw new Error('useLoader must be used within a LoaderProvider');
  }
  return context;
}
