/**
 * Concern Registry Loader
 *
 * Centralized configuration for concern_id → (domain, archetype) mappings.
 * Replaces hardcoded ARCHETYPE_MATRIX with config-driven approach.
 */

import * as fs from 'fs';
import * as path from 'path';
import { ArchetypeType } from '../orchestrator/types';

export interface ConcernMetadata {
  domain: string;
  archetype: ArchetypeType;
  specialty: string | null;
  description: string;
  category: string;
}

export interface RegexPattern {
  pattern: string;
  domain: string;
  archetype: ArchetypeType;
  description: string;
}

export interface ConcernRegistry {
  version: string;
  last_updated: string;
  description: string;
  concerns: Record<string, ConcernMetadata>;
  regex_patterns: Record<string, RegexPattern>;
  metadata: {
    total_concerns: number;
    domains: string[];
    archetypes: string[];
  };
}

export interface ArchetypeMapping {
  concern: string | RegExp;
  domain: string;
  archetype: ArchetypeType;
  description: string;
  specialty?: string | null;
}

let cachedRegistry: ConcernRegistry | null = null;
let cachedMappings: ArchetypeMapping[] | null = null;

const REGISTRY_PATH = path.join(__dirname, 'concern-registry.json');

/**
 * Load concern registry from config file
 */
export function loadConcernRegistry(): ConcernRegistry {
  if (cachedRegistry) return cachedRegistry;

  try {
    const data = fs.readFileSync(REGISTRY_PATH, 'utf-8');
    cachedRegistry = JSON.parse(data);
    return cachedRegistry!;
  } catch (error: any) {
    throw new Error(`Failed to load concern registry: ${error.message}`);
  }
}

/**
 * Convert registry to ARCHETYPE_MATRIX format
 *
 * This provides backward compatibility with existing code while
 * reading from the centralized config file.
 */
export function getArchetypeMappings(): ArchetypeMapping[] {
  if (cachedMappings) return cachedMappings;

  const registry = loadConcernRegistry();
  const mappings: ArchetypeMapping[] = [];

  // Add exact concern ID mappings
  for (const [concernId, metadata] of Object.entries(registry.concerns)) {
    mappings.push({
      concern: concernId,
      domain: metadata.domain,
      archetype: metadata.archetype,
      description: metadata.description,
      specialty: metadata.specialty,
    });
  }

  // Add regex pattern mappings
  for (const [_name, pattern] of Object.entries(registry.regex_patterns)) {
    mappings.push({
      concern: new RegExp(pattern.pattern, 'i'),
      domain: pattern.domain,
      archetype: pattern.archetype,
      description: pattern.description,
    });
  }

  cachedMappings = mappings;
  return mappings;
}

/**
 * Get metadata for a specific concern ID
 */
export function getConcernMetadata(concernId: string): ConcernMetadata | null {
  const registry = loadConcernRegistry();

  // Try exact match first
  if (registry.concerns[concernId]) {
    return registry.concerns[concernId];
  }

  // Try regex patterns
  for (const pattern of Object.values(registry.regex_patterns)) {
    const regex = new RegExp(pattern.pattern, 'i');
    if (regex.test(concernId)) {
      return {
        domain: pattern.domain,
        archetype: pattern.archetype,
        specialty: null,
        description: pattern.description,
        category: 'usnwr_outcome',
      };
    }
  }

  return null;
}

/**
 * Get all concern IDs (for validation in S0)
 */
export function getAllConcernIds(): string[] {
  const registry = loadConcernRegistry();
  return Object.keys(registry.concerns);
}

/**
 * Get all domains
 */
export function getAllDomains(): string[] {
  const registry = loadConcernRegistry();
  return registry.metadata.domains;
}

/**
 * Get concerns by domain
 */
export function getConcernsByDomain(domain: string): string[] {
  const registry = loadConcernRegistry();
  return Object.entries(registry.concerns)
    .filter(([_, meta]) => meta.domain === domain)
    .map(([id, _]) => id);
}

/**
 * Validate registry integrity
 */
export function validateRegistry(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  try {
    const registry = loadConcernRegistry();

    // Check version
    if (!registry.version) {
      errors.push('Missing version field');
    }

    // Check concerns
    if (!registry.concerns || Object.keys(registry.concerns).length === 0) {
      errors.push('No concerns defined');
    }

    // Validate each concern has required fields
    for (const [id, meta] of Object.entries(registry.concerns)) {
      if (!meta.domain) errors.push(`Concern ${id} missing domain`);
      if (!meta.archetype) errors.push(`Concern ${id} missing archetype`);
      if (!meta.description) errors.push(`Concern ${id} missing description`);
    }

    // Validate regex patterns compile
    for (const [name, pattern] of Object.entries(registry.regex_patterns)) {
      try {
        new RegExp(pattern.pattern, 'i');
      } catch (e) {
        errors.push(`Invalid regex pattern for ${name}: ${pattern.pattern}`);
      }
    }

    // Check metadata matches actual data
    const actualDomains = new Set(Object.values(registry.concerns).map(c => c.domain));
    const declaredDomains = new Set(registry.metadata.domains);

    for (const domain of actualDomains) {
      if (!declaredDomains.has(domain)) {
        errors.push(`Domain "${domain}" used but not declared in metadata`);
      }
    }

  } catch (error: any) {
    errors.push(`Failed to validate registry: ${error.message}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
