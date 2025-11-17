/**
 * Domain Switcher Component
 * Allows users to switch between clinical domains (CLABSI, CAUTI, SSI, etc.)
 */

import React, { useState } from 'react';
import { useDomainConfig } from '../contexts/DomainConfigContext';
import './DomainSwitcher.css';

interface Domain {
  id: string;
  name: string;
  icon: string;
}

const AVAILABLE_DOMAINS: Domain[] = [
  { id: 'CLABSI', name: 'CLABSI', icon: '💉' },
  { id: 'CAUTI', name: 'CAUTI', icon: '🩺' },
  { id: 'SSI', name: 'SSI', icon: '🏥' },
];

const DomainSwitcher: React.FC = () => {
  const { config, setDomain, loading } = useDomainConfig();
  const [isOpen, setIsOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  const handleDomainChange = async (domainId: string) => {
    if (domainId === config.domain_name || switching) return;

    setSwitching(true);
    setIsOpen(false);

    try {
      await setDomain(domainId);
    } catch (error) {
      console.error('Error switching domain:', error);
      alert(`Failed to switch to ${domainId}. Please try again.`);
    } finally {
      setSwitching(false);
    }
  };

  const currentDomain = AVAILABLE_DOMAINS.find(d => d.id === config.domain_name) || AVAILABLE_DOMAINS[0];

  return (
    <div className="domain-switcher">
      <button
        className="domain-switcher-toggle"
        data-testid="domain-switcher-toggle"
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading || switching}
      >
        <span className="current-domain-icon">{currentDomain.icon}</span>
        <span className="current-domain-name">{currentDomain.name}</span>
        <span className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </button>

      {isOpen && (
        <>
          <div className="domain-switcher-overlay" onClick={() => setIsOpen(false)} />
          <div className="domain-switcher-dropdown">
            <div className="dropdown-header">Switch Domain</div>
            {AVAILABLE_DOMAINS.map((domain) => (
              <button
                key={domain.id}
                className={`domain-option ${domain.id === config.domain_name ? 'active' : ''}`}
                data-testid={`domain-option-${domain.id.toLowerCase()}`}
                onClick={() => handleDomainChange(domain.id)}
                disabled={domain.id === config.domain_name || switching}
              >
                <span className="domain-icon">{domain.icon}</span>
                <span className="domain-name">{domain.name}</span>
                {domain.id === config.domain_name && (
                  <span className="active-indicator">✓</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}

      {switching && (
        <div className="switching-indicator">Switching...</div>
      )}
    </div>
  );
};

export default DomainSwitcher;
