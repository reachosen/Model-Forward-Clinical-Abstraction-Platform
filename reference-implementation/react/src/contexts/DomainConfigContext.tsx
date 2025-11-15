/**
 * Domain Configuration Context
 * Provides domain config to all components
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { DomainConfig, DEFAULT_DOMAIN_CONFIG } from '../types/domainConfig';

interface DomainConfigContextType {
  config: DomainConfig;
  setDomain: (domainName: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

const DomainConfigContext = createContext<DomainConfigContextType | undefined>(undefined);

interface DomainConfigProviderProps {
  children: ReactNode;
  initialDomain?: string;
}

export const DomainConfigProvider: React.FC<DomainConfigProviderProps> = ({
  children,
  initialDomain = 'CLABSI',
}) => {
  const [config, setConfig] = useState<DomainConfig>(DEFAULT_DOMAIN_CONFIG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDomainConfig = async (domainName: string) => {
    setLoading(true);
    setError(null);

    try {
      // In development, load from public folder
      // In production, this would come from API
      const response = await fetch(`/configs/domains/${domainName}.json`);

      if (!response.ok) {
        throw new Error(`Failed to load domain config: ${domainName}`);
      }

      const domainConfig: DomainConfig = await response.json();
      setConfig(domainConfig);

      // Persist to localStorage
      localStorage.setItem('preferred_domain', domainName);
    } catch (err) {
      console.error('Error loading domain config:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      // Fall back to default
      setConfig(DEFAULT_DOMAIN_CONFIG);
    } finally {
      setLoading(false);
    }
  };

  const setDomain = async (domainName: string) => {
    await loadDomainConfig(domainName);
  };

  useEffect(() => {
    // Load initial domain or restore from localStorage
    const savedDomain = localStorage.getItem('preferred_domain') || initialDomain;
    loadDomainConfig(savedDomain);
  }, [initialDomain]);

  return (
    <DomainConfigContext.Provider value={{ config, setDomain, loading, error }}>
      {children}
    </DomainConfigContext.Provider>
  );
};

export const useDomainConfig = (): DomainConfigContextType => {
  const context = useContext(DomainConfigContext);
  if (context === undefined) {
    throw new Error('useDomainConfig must be used within a DomainConfigProvider');
  }
  return context;
};
