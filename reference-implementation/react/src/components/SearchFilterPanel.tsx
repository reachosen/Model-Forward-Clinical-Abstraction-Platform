/**
 * Search & Filter Panel Component
 * Multi-faceted search and filtering for case list
 * Adapted from Vercel v0.dev generation
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';
import { CaseInfo, FilterOptions, SortOption } from '../types';
import './SearchFilterPanel.css';

interface SearchFilterPanelProps {
  cases: CaseInfo[];
  onFilteredCasesChange: (filteredCases: CaseInfo[]) => void;
  filterOptions?: FilterOptions;
}

interface FilterState {
  searchTerm: string;
  selectedRiskLevels: string[];
  selectedDeterminations: string[];
  selectedDomains: string[];
  sortBy: SortOption;
}

const SearchFilterPanel: React.FC<SearchFilterPanelProps> = ({
  cases,
  onFilteredCasesChange,
  filterOptions,
}) => {
  const [filterState, setFilterState] = useState<FilterState>({
    searchTerm: '',
    selectedRiskLevels: [],
    selectedDeterminations: [],
    selectedDomains: [],
    sortBy: 'date-desc',
  });

  const [showRiskDropdown, setShowRiskDropdown] = useState(false);
  const [showDeterminationDropdown, setShowDeterminationDropdown] = useState(false);
  const [showDomainDropdown, setShowDomainDropdown] = useState(false);

  // Derive filter options from cases if not provided
  const derivedFilterOptions = useMemo(() => {
    if (filterOptions) return filterOptions;

    const riskLevels = Array.from(
      new Set(cases.map((c) => c.risk_level).filter(Boolean))
    ) as Array<'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL'>;

    const determinations = Array.from(
      new Set(cases.map((c) => c.determination).filter(Boolean))
    ) as string[];

    const domains = Array.from(
      new Set(cases.map((c) => c.domain).filter(Boolean))
    ) as string[];

    return { riskLevels, determinations, domains };
  }, [cases, filterOptions]);

  // Debounced search term
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(filterState.searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [filterState.searchTerm]);

  // Filter and sort cases
  const filteredCases = useMemo(() => {
    let result = [...cases];

    // Apply search filter
    if (debouncedSearchTerm) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      result = result.filter(
        (c) =>
          c.patient_id.toLowerCase().includes(searchLower) ||
          c.mrn.toLowerCase().includes(searchLower) ||
          c.name.toLowerCase().includes(searchLower) ||
          c.scenario.toLowerCase().includes(searchLower)
      );
    }

    // Apply risk level filter (OR within category)
    if (filterState.selectedRiskLevels.length > 0) {
      result = result.filter(
        (c) => c.risk_level && filterState.selectedRiskLevels.includes(c.risk_level)
      );
    }

    // Apply determination filter (OR within category)
    if (filterState.selectedDeterminations.length > 0) {
      result = result.filter(
        (c) =>
          c.determination && filterState.selectedDeterminations.includes(c.determination)
      );
    }

    // Apply domain filter (OR within category)
    if (filterState.selectedDomains.length > 0) {
      result = result.filter(
        (c) => c.domain && filterState.selectedDomains.includes(c.domain)
      );
    }

    // Apply sort
    switch (filterState.sortBy) {
      case 'date-desc':
        result.sort(
          (a, b) =>
            new Date(b.abstraction_datetime || 0).getTime() -
            new Date(a.abstraction_datetime || 0).getTime()
        );
        break;
      case 'date-asc':
        result.sort(
          (a, b) =>
            new Date(a.abstraction_datetime || 0).getTime() -
            new Date(b.abstraction_datetime || 0).getTime()
        );
        break;
      case 'risk-desc':
        result.sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0));
        break;
      case 'name-asc':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return result;
  }, [
    cases,
    debouncedSearchTerm,
    filterState.selectedRiskLevels,
    filterState.selectedDeterminations,
    filterState.selectedDomains,
    filterState.sortBy,
  ]);

  // Notify parent of filtered cases
  useEffect(() => {
    onFilteredCasesChange(filteredCases);
  }, [filteredCases, onFilteredCasesChange]);

  // Calculate active filters count
  const activeFiltersCount =
    filterState.selectedRiskLevels.length +
    filterState.selectedDeterminations.length +
    filterState.selectedDomains.length;

  const hasActiveFilters =
    activeFiltersCount > 0 || filterState.searchTerm.length > 0;

  // Clear all filters
  const clearAllFilters = () => {
    setFilterState({
      searchTerm: '',
      selectedRiskLevels: [],
      selectedDeterminations: [],
      selectedDomains: [],
      sortBy: 'date-desc',
    });
  };

  // Remove individual filter
  const removeFilter = (category: 'risk' | 'determination' | 'domain', value: string) => {
    switch (category) {
      case 'risk':
        setFilterState((prev) => ({
          ...prev,
          selectedRiskLevels: prev.selectedRiskLevels.filter((v) => v !== value),
        }));
        break;
      case 'determination':
        setFilterState((prev) => ({
          ...prev,
          selectedDeterminations: prev.selectedDeterminations.filter(
            (v) => v !== value
          ),
        }));
        break;
      case 'domain':
        setFilterState((prev) => ({
          ...prev,
          selectedDomains: prev.selectedDomains.filter((v) => v !== value),
        }));
        break;
    }
  };

  const getRiskLevelClass = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'risk-critical';
      case 'HIGH':
        return 'risk-high';
      case 'MODERATE':
        return 'risk-moderate';
      case 'LOW':
        return 'risk-low';
      default:
        return 'risk-default';
    }
  };

  const toggleRiskLevel = (level: string) => {
    const isSelected = filterState.selectedRiskLevels.includes(level);
    setFilterState((prev) => ({
      ...prev,
      selectedRiskLevels: isSelected
        ? prev.selectedRiskLevels.filter((l) => l !== level)
        : [...prev.selectedRiskLevels, level],
    }));
  };

  const toggleDetermination = (determination: string) => {
    const isSelected = filterState.selectedDeterminations.includes(determination);
    setFilterState((prev) => ({
      ...prev,
      selectedDeterminations: isSelected
        ? prev.selectedDeterminations.filter((d) => d !== determination)
        : [...prev.selectedDeterminations, determination],
    }));
  };

  const toggleDomain = (domain: string) => {
    const isSelected = filterState.selectedDomains.includes(domain);
    setFilterState((prev) => ({
      ...prev,
      selectedDomains: isSelected
        ? prev.selectedDomains.filter((d) => d !== domain)
        : [...prev.selectedDomains, domain],
    }));
  };

  return (
    <div className="search-filter-panel">
      <h2 className="panel-title">
        <Search size={20} />
        Search & Filter
      </h2>

      {/* Search Input */}
      <div className="search-input-container">
        <Search className="search-icon" size={20} />
        <input
          type="text"
          placeholder="Search patients, MRN, ID..."
          value={filterState.searchTerm}
          onChange={(e) =>
            setFilterState((prev) => ({ ...prev, searchTerm: e.target.value }))
          }
          className="search-input"
        />
        {filterState.searchTerm && (
          <button
            className="clear-search-button"
            onClick={() =>
              setFilterState((prev) => ({ ...prev, searchTerm: '' }))
            }
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="filters-section">
        <h3 className="section-label">Filters</h3>

        {/* Risk Level Filter */}
        <div className="filter-group">
          <label className="filter-label">Risk Level</label>
          <div className="dropdown-container">
            <button
              className="dropdown-trigger"
              onClick={() => setShowRiskDropdown(!showRiskDropdown)}
            >
              <span>
                {filterState.selectedRiskLevels.length > 0
                  ? `${filterState.selectedRiskLevels.length} selected`
                  : 'All Levels'}
              </span>
              <ChevronDown size={16} />
            </button>
            {showRiskDropdown && (
              <div className="dropdown-menu">
                {derivedFilterOptions.riskLevels.map((level) => (
                  <label key={level} className="dropdown-item">
                    <input
                      type="checkbox"
                      checked={filterState.selectedRiskLevels.includes(level)}
                      onChange={() => toggleRiskLevel(level)}
                    />
                    <span>{level}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Determination Filter */}
        <div className="filter-group">
          <label className="filter-label">Determination</label>
          <div className="dropdown-container">
            <button
              className="dropdown-trigger"
              onClick={() => setShowDeterminationDropdown(!showDeterminationDropdown)}
            >
              <span>
                {filterState.selectedDeterminations.length > 0
                  ? `${filterState.selectedDeterminations.length} selected`
                  : 'All'}
              </span>
              <ChevronDown size={16} />
            </button>
            {showDeterminationDropdown && (
              <div className="dropdown-menu">
                {derivedFilterOptions.determinations.map((determination) => (
                  <label key={determination} className="dropdown-item">
                    <input
                      type="checkbox"
                      checked={filterState.selectedDeterminations.includes(determination)}
                      onChange={() => toggleDetermination(determination)}
                    />
                    <span>{determination}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Domain Filter */}
        <div className="filter-group">
          <label className="filter-label">Domain</label>
          <div className="dropdown-container">
            <button
              className="dropdown-trigger"
              onClick={() => setShowDomainDropdown(!showDomainDropdown)}
            >
              <span>
                {filterState.selectedDomains.length > 0
                  ? `${filterState.selectedDomains.length} selected`
                  : 'All Domains'}
              </span>
              <ChevronDown size={16} />
            </button>
            {showDomainDropdown && (
              <div className="dropdown-menu">
                {derivedFilterOptions.domains.map((domain) => (
                  <label key={domain} className="dropdown-item">
                    <input
                      type="checkbox"
                      checked={filterState.selectedDomains.includes(domain)}
                      onChange={() => toggleDomain(domain)}
                    />
                    <span>{domain}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div className="active-filters-section">
          <div className="active-filters-header">
            <h3 className="section-label">Active Filters</h3>
            <button
              className="clear-all-button"
              onClick={clearAllFilters}
            >
              Clear All
            </button>
          </div>
          <div className="filter-chips">
            {filterState.selectedRiskLevels.map((level) => (
              <span
                key={level}
                className={`filter-chip ${getRiskLevelClass(level)}`}
              >
                {level}
                <button
                  onClick={() => removeFilter('risk', level)}
                  className="chip-remove"
                  aria-label={`Remove ${level} filter`}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            {filterState.selectedDeterminations.map((determination) => (
              <span
                key={determination}
                className="filter-chip chip-determination"
              >
                {determination}
                <button
                  onClick={() => removeFilter('determination', determination)}
                  className="chip-remove"
                  aria-label={`Remove ${determination} filter`}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            {filterState.selectedDomains.map((domain) => (
              <span
                key={domain}
                className="filter-chip chip-domain"
              >
                {domain}
                <button
                  onClick={() => removeFilter('domain', domain)}
                  className="chip-remove"
                  aria-label={`Remove ${domain} filter`}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Sort Options */}
      <div className="sort-section">
        <h3 className="section-label">Sort By</h3>
        <div className="sort-options">
          <label className="sort-option">
            <input
              type="radio"
              name="sort"
              value="date-desc"
              checked={filterState.sortBy === 'date-desc'}
              onChange={(e) =>
                setFilterState((prev) => ({ ...prev, sortBy: e.target.value as SortOption }))
              }
            />
            <span>Date - Newest First</span>
          </label>
          <label className="sort-option">
            <input
              type="radio"
              name="sort"
              value="risk-desc"
              checked={filterState.sortBy === 'risk-desc'}
              onChange={(e) =>
                setFilterState((prev) => ({ ...prev, sortBy: e.target.value as SortOption }))
              }
            />
            <span>Risk Score - High to Low</span>
          </label>
          <label className="sort-option">
            <input
              type="radio"
              name="sort"
              value="name-asc"
              checked={filterState.sortBy === 'name-asc'}
              onChange={(e) =>
                setFilterState((prev) => ({ ...prev, sortBy: e.target.value as SortOption }))
              }
            />
            <span>Patient Name - A to Z</span>
          </label>
        </div>
      </div>

      {/* Result Count */}
      <div className="result-count" role="status" aria-live="polite">
        Showing {filteredCases.length} of {cases.length} cases
      </div>
    </div>
  );
};

export default SearchFilterPanel;
