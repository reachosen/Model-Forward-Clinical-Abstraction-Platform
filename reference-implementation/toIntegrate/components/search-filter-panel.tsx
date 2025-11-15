'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';
import { CaseInfo, FilterOptions, SortOption } from '@/types/case';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

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

export default function SearchFilterPanel({
  cases,
  onFilteredCasesChange,
  filterOptions,
}: SearchFilterPanelProps) {
  const [filterState, setFilterState] = useState<FilterState>({
    searchTerm: '',
    selectedRiskLevels: [],
    selectedDeterminations: [],
    selectedDomains: [],
    sortBy: 'date-desc',
  });

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

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'MODERATE':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'LOW':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Search className="w-5 h-5 text-muted-foreground" />
        Search & Filter
      </h2>

      {/* Search Input */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search patients, MRN, ID..."
          value={filterState.searchTerm}
          onChange={(e) =>
            setFilterState((prev) => ({ ...prev, searchTerm: e.target.value }))
          }
          className="pl-10 pr-10 h-12 text-base"
        />
        {filterState.searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setFilterState((prev) => ({ ...prev, searchTerm: '' }))
            }
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="space-y-4 mb-6">
        <h3 className="text-sm font-medium text-muted-foreground">Filters</h3>

        <div className="grid gap-3">
          {/* Risk Level Filter */}
          <div>
            <Label htmlFor="risk-filter" className="text-sm mb-2 block">
              Risk Level
            </Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between h-11"
                  id="risk-filter"
                >
                  <span>
                    {filterState.selectedRiskLevels.length > 0
                      ? `${filterState.selectedRiskLevels.length} selected`
                      : 'All Levels'}
                  </span>
                  <ChevronDown className="w-4 h-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                {derivedFilterOptions.riskLevels.map((level) => (
                  <DropdownMenuCheckboxItem
                    key={level}
                    checked={filterState.selectedRiskLevels.includes(level)}
                    onCheckedChange={(checked) => {
                      setFilterState((prev) => ({
                        ...prev,
                        selectedRiskLevels: checked
                          ? [...prev.selectedRiskLevels, level]
                          : prev.selectedRiskLevels.filter((l) => l !== level),
                      }));
                    }}
                  >
                    {level}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Determination Filter */}
          <div>
            <Label htmlFor="determination-filter" className="text-sm mb-2 block">
              Determination
            </Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between h-11"
                  id="determination-filter"
                >
                  <span>
                    {filterState.selectedDeterminations.length > 0
                      ? `${filterState.selectedDeterminations.length} selected`
                      : 'All'}
                  </span>
                  <ChevronDown className="w-4 h-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                {derivedFilterOptions.determinations.map((determination) => (
                  <DropdownMenuCheckboxItem
                    key={determination}
                    checked={filterState.selectedDeterminations.includes(determination)}
                    onCheckedChange={(checked) => {
                      setFilterState((prev) => ({
                        ...prev,
                        selectedDeterminations: checked
                          ? [...prev.selectedDeterminations, determination]
                          : prev.selectedDeterminations.filter(
                              (d) => d !== determination
                            ),
                      }));
                    }}
                  >
                    {determination}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Domain Filter */}
          <div>
            <Label htmlFor="domain-filter" className="text-sm mb-2 block">
              Domain
            </Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between h-11"
                  id="domain-filter"
                >
                  <span>
                    {filterState.selectedDomains.length > 0
                      ? `${filterState.selectedDomains.length} selected`
                      : 'All Domains'}
                  </span>
                  <ChevronDown className="w-4 h-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                {derivedFilterOptions.domains.map((domain) => (
                  <DropdownMenuCheckboxItem
                    key={domain}
                    checked={filterState.selectedDomains.includes(domain)}
                    onCheckedChange={(checked) => {
                      setFilterState((prev) => ({
                        ...prev,
                        selectedDomains: checked
                          ? [...prev.selectedDomains, domain]
                          : prev.selectedDomains.filter((d) => d !== domain),
                      }));
                    }}
                  >
                    {domain}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div className="mb-6 pb-6 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-muted-foreground">
              Active Filters
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-xs h-auto p-1 text-primary hover:text-primary/80"
            >
              Clear All
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {filterState.selectedRiskLevels.map((level) => (
              <Badge
                key={level}
                variant="secondary"
                className={cn('gap-1', getRiskLevelColor(level))}
              >
                {level}
                <button
                  onClick={() => removeFilter('risk', level)}
                  className="hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            {filterState.selectedDeterminations.map((determination) => (
              <Badge
                key={determination}
                variant="secondary"
                className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 gap-1"
              >
                {determination}
                <button
                  onClick={() => removeFilter('determination', determination)}
                  className="hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            {filterState.selectedDomains.map((domain) => (
              <Badge
                key={domain}
                variant="secondary"
                className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 gap-1"
              >
                {domain}
                <button
                  onClick={() => removeFilter('domain', domain)}
                  className="hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Sort Options */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Sort By</h3>
        <RadioGroup
          value={filterState.sortBy}
          onValueChange={(value) =>
            setFilterState((prev) => ({ ...prev, sortBy: value as SortOption }))
          }
          className="space-y-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="date-desc" id="date-desc" />
            <Label htmlFor="date-desc" className="font-normal cursor-pointer">
              Date - Newest First
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="risk-desc" id="risk-desc" />
            <Label htmlFor="risk-desc" className="font-normal cursor-pointer">
              Risk Score - High to Low
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="name-asc" id="name-asc" />
            <Label htmlFor="name-asc" className="font-normal cursor-pointer">
              Patient Name - A to Z
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Result Count */}
      <div
        className="text-sm text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        Showing {filteredCases.length} of {cases.length} cases
      </div>
    </div>
  );
}
