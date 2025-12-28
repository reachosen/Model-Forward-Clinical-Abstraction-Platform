/**
 * templateLoader.ts - Load and interpolate prompt templates from domain folders
 *
 * Loads .md prompt templates with fallback chain:
 *   1. Metric-specific: domains/.../metrics/{METRIC}/prompts/{template}.md
 *   2. Specialty shared: domains/.../_{specialty}/_shared/prompts/{template}.md
 *   3. Framework shared: domains/{FRAMEWORK}/_shared/prompts/{template}.md
 *
 * Supports Handlebars-style {{variable}} interpolation.
 */

import * as fs from 'fs';
import * as path from 'path';
import { Paths, MetricPath } from './pathConfig';

// =============================================================================
// Types
// =============================================================================

export interface TemplateContext {
  metric: string;
  archetype?: string;
  domain?: string;
  framework?: string;
  specialty?: string;
  [key: string]: unknown;
}

export interface LoadedTemplate {
  content: string;
  sourcePath: string;
  level: 'metric' | 'specialty' | 'framework';
}

export interface TemplateLoadOptions {
  /** If true, returns null instead of throwing when template not found */
  optional?: boolean;
  /** Additional search paths to check before the standard fallback chain */
  additionalPaths?: string[];
}

// =============================================================================
// Simple Template Engine
// =============================================================================

/**
 * Simple Handlebars-compatible template interpolation.
 * Supports:
 *   - {{variable}} - simple replacement
 *   - {{#if variable}}...{{/if}} - conditional blocks
 *   - {{#each array}}...{{/each}} - iteration (basic)
 *   - {{{raw}}} - unescaped output (same as {{}} in our impl)
 */
export function interpolate(template: string, context: TemplateContext): string {
  let result = template;

  // Handle {{#if variable}}...{{/if}} blocks
  result = result.replace(
    /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_, key, content) => {
      const value = getNestedValue(context, key);
      return value ? content : '';
    }
  );

  // Handle {{#unless variable}}...{{/unless}} blocks
  result = result.replace(
    /\{\{#unless\s+(\w+)\}\}([\s\S]*?)\{\{\/unless\}\}/g,
    (_, key, content) => {
      const value = getNestedValue(context, key);
      return !value ? content : '';
    }
  );

  // Handle {{#each array}}...{{/each}} blocks (basic)
  result = result.replace(
    /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g,
    (_, key, content) => {
      const array = getNestedValue(context, key);
      if (!Array.isArray(array)) return '';
      return array.map((item, index) => {
        // Replace {{this}} with item, {{@index}} with index
        let itemContent = content.replace(/\{\{this\}\}/g, String(item));
        itemContent = itemContent.replace(/\{\{@index\}\}/g, String(index));
        // Also support {{.}} as alias for {{this}}
        itemContent = itemContent.replace(/\{\{\.\}\}/g, String(item));
        return itemContent;
      }).join('');
    }
  );

  // Handle {{{variable}}} (triple braces - raw, unescaped)
  result = result.replace(
    /\{\{\{(\w+(?:\.\w+)*)\}\}\}/g,
    (_, key) => {
      const value = getNestedValue(context, key);
      return value !== undefined ? String(value) : '';
    }
  );

  // Handle {{variable}} and {{object.property}}
  result = result.replace(
    /\{\{(\w+(?:\.\w+)*)\}\}/g,
    (_, key) => {
      const value = getNestedValue(context, key);
      return value !== undefined ? String(value) : '';
    }
  );

  return result;
}

/**
 * Gets a nested value from an object using dot notation.
 * e.g., getNestedValue({ a: { b: 1 } }, 'a.b') => 1
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current, key) => {
    if (current && typeof current === 'object') {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj as unknown);
}

// =============================================================================
// Template Loading
// =============================================================================

/**
 * Builds the fallback search path chain for a template.
 */
function buildSearchPaths(
  metricPath: MetricPath,
  templateName: string,
  options?: TemplateLoadOptions
): string[] {
  const searchPaths: string[] = [];

  // Additional paths first (if provided)
  if (options?.additionalPaths) {
    searchPaths.push(...options.additionalPaths.map(p =>
      path.join(p, `${templateName}.md`)
    ));
  }

  // 1. Metric-specific
  searchPaths.push(
    path.join(Paths.metricPrompts(metricPath), `${templateName}.md`)
  );

  // 2. Specialty shared (if applicable)
  if (metricPath.specialty) {
    searchPaths.push(
      path.join(
        Paths.sharedPrompts(metricPath.framework, metricPath.specialty),
        `${templateName}.md`
      )
    );
  }

  // 3. Framework shared
  searchPaths.push(
    path.join(Paths.sharedPrompts(metricPath.framework), `${templateName}.md`)
  );

  return searchPaths;
}

/**
 * Loads a prompt template with fallback chain.
 *
 * @example
 * const metricPath = resolveMetricPath('I25');
 * const { content } = loadTemplate(metricPath, 'signal_enrichment', { metric: 'I25' });
 */
export function loadTemplate(
  metricPath: MetricPath,
  templateName: string,
  context: TemplateContext,
  options?: TemplateLoadOptions
): LoadedTemplate {
  const searchPaths = buildSearchPaths(metricPath, templateName, options);

  for (const templatePath of searchPaths) {
    if (fs.existsSync(templatePath)) {
      const raw = fs.readFileSync(templatePath, 'utf-8');
      const content = interpolate(raw, {
        ...context,
        metric: metricPath.metric,
        framework: metricPath.framework,
        specialty: metricPath.specialty,
      });

      // Determine level based on path
      let level: 'metric' | 'specialty' | 'framework' = 'framework';
      if (templatePath.includes(`metrics/${metricPath.metric}`)) {
        level = 'metric';
      } else if (metricPath.specialty && templatePath.includes(metricPath.specialty)) {
        level = 'specialty';
      }

      return { content, sourcePath: templatePath, level };
    }
  }

  if (options?.optional) {
    return { content: '', sourcePath: '', level: 'framework' };
  }

  throw new Error(
    `Template '${templateName}' not found for ${metricPath.metric}.\n` +
    `Searched paths:\n${searchPaths.map(p => `  - ${p}`).join('\n')}`
  );
}

/**
 * Loads a raw template without interpolation.
 */
export function loadTemplateRaw(
  metricPath: MetricPath,
  templateName: string,
  options?: TemplateLoadOptions
): LoadedTemplate {
  const searchPaths = buildSearchPaths(metricPath, templateName, options);

  for (const templatePath of searchPaths) {
    if (fs.existsSync(templatePath)) {
      const content = fs.readFileSync(templatePath, 'utf-8');

      let level: 'metric' | 'specialty' | 'framework' = 'framework';
      if (templatePath.includes(`metrics/${metricPath.metric}`)) {
        level = 'metric';
      } else if (metricPath.specialty && templatePath.includes(metricPath.specialty)) {
        level = 'specialty';
      }

      return { content, sourcePath: templatePath, level };
    }
  }

  if (options?.optional) {
    return { content: '', sourcePath: '', level: 'framework' };
  }

  throw new Error(
    `Template '${templateName}' not found for ${metricPath.metric}.\n` +
    `Searched paths:\n${searchPaths.map(p => `  - ${p}`).join('\n')}`
  );
}

// =============================================================================
// Archetype Template Loading
// =============================================================================

/**
 * Builds search paths for archetype-specific templates.
 */
function buildArchetypeSearchPaths(
  metricPath: MetricPath,
  archetype: string,
  templateName: string
): string[] {
  const searchPaths: string[] = [];

  // 1. Metric + archetype specific
  searchPaths.push(
    path.join(
      Paths.metricArchetypes(metricPath),
      archetype,
      'prompts',
      `${templateName}.md`
    )
  );

  // 2. Specialty shared archetype
  if (metricPath.specialty) {
    searchPaths.push(
      path.join(
        Paths.sharedArchetypes(metricPath.framework, metricPath.specialty),
        archetype,
        `${templateName}.md`
      )
    );
  }

  // 3. Framework shared archetype
  searchPaths.push(
    path.join(
      Paths.sharedArchetypes(metricPath.framework),
      archetype,
      `${templateName}.md`
    )
  );

  return searchPaths;
}

/**
 * Loads an archetype-specific template with fallback to base template.
 *
 * Search order:
 *   1. Metric + archetype: metrics/{METRIC}/archetypes/{ARCHETYPE}/prompts/{template}.md
 *   2. Specialty shared archetype: _shared/archetypes/{ARCHETYPE}/{template}.md
 *   3. Framework shared archetype: _shared/archetypes/{ARCHETYPE}/{template}.md
 *   4. Falls back to loadTemplate() if no archetype-specific found
 */
export function loadArchetypeTemplate(
  metricPath: MetricPath,
  archetype: string,
  templateName: string,
  context: TemplateContext,
  options?: TemplateLoadOptions
): LoadedTemplate {
  const archetypeSearchPaths = buildArchetypeSearchPaths(metricPath, archetype, templateName);

  for (const templatePath of archetypeSearchPaths) {
    if (fs.existsSync(templatePath)) {
      const raw = fs.readFileSync(templatePath, 'utf-8');
      const content = interpolate(raw, {
        ...context,
        archetype,
        metric: metricPath.metric,
        framework: metricPath.framework,
        specialty: metricPath.specialty,
      });

      return { content, sourcePath: templatePath, level: 'metric' };
    }
  }

  // Fallback to base template
  return loadTemplate(metricPath, templateName, { ...context, archetype }, options);
}

// =============================================================================
// Definition File Loading
// =============================================================================

/**
 * Loads a JSON definition file from the metric's definitions/ folder.
 * Falls back to _shared/definitions/ if not found at metric level.
 */
export function loadDefinition<T = unknown>(
  metricPath: MetricPath,
  definitionName: string,
  options?: { optional?: boolean }
): T | null {
  const searchPaths = [
    // 1. Metric-specific
    path.join(Paths.metricDefinitions(metricPath), `${definitionName}.json`),

    // 2. Specialty shared
    ...(metricPath.specialty ? [
      path.join(Paths.sharedDefinitions(metricPath.framework, metricPath.specialty), `${definitionName}.json`)
    ] : []),

    // 3. Framework shared
    path.join(Paths.sharedDefinitions(metricPath.framework), `${definitionName}.json`),
  ];

  for (const defPath of searchPaths) {
    if (fs.existsSync(defPath)) {
      const content = fs.readFileSync(defPath, 'utf-8');
      return JSON.parse(content) as T;
    }
  }

  if (options?.optional) {
    return null;
  }

  throw new Error(
    `Definition '${definitionName}' not found for ${metricPath.metric}.\n` +
    `Searched paths:\n${searchPaths.map(p => `  - ${p}`).join('\n')}`
  );
}

// =============================================================================
// Template Listing
// =============================================================================

/**
 * Lists all available templates for a metric (including inherited from _shared).
 */
export function listAvailableTemplates(metricPath: MetricPath): string[] {
  const templates = new Set<string>();

  const dirsToCheck = [
    Paths.metricPrompts(metricPath),
    ...(metricPath.specialty
      ? [Paths.sharedPrompts(metricPath.framework, metricPath.specialty)]
      : []),
    Paths.sharedPrompts(metricPath.framework),
  ];

  for (const dir of dirsToCheck) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      files
        .filter(f => f.endsWith('.md'))
        .forEach(f => templates.add(f.replace('.md', '')));
    }
  }

  return Array.from(templates).sort();
}

/**
 * Lists all available definitions for a metric.
 */
export function listAvailableDefinitions(metricPath: MetricPath): string[] {
  const definitions = new Set<string>();

  const dirsToCheck = [
    Paths.metricDefinitions(metricPath),
    ...(metricPath.specialty
      ? [Paths.sharedDefinitions(metricPath.framework, metricPath.specialty)]
      : []),
    Paths.sharedDefinitions(metricPath.framework),
  ];

  for (const dir of dirsToCheck) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      files
        .filter(f => f.endsWith('.json'))
        .forEach(f => definitions.add(f.replace('.json', '')));
    }
  }

  return Array.from(definitions).sort();
}
