import * as fs from 'fs';
import * as path from 'path';

/**
 * Dynamic Prompt Loader
 * 
 * Resolves and loads prompt templates from the domains_registry.
 * Falls back to internal config if registry file not found.
 */

export function loadPromptFromRegistry(
  domain: string,
  specialty: string | undefined,
  taskType: string
): string | null {
  const baseRegistry = path.join(__dirname, '../../domains_registry');
  
  // Potential search paths (Priority order)
  const searchPaths: string[] = [];

  // 1. Specialty-specific (if provided) - e.g. USNWR/Orthopedics/Hip_Fracture/_shared... (Future proofing)
  if (specialty) {
     searchPaths.push(path.join(baseRegistry, 'USNWR', domain, specialty, '_shared', 'prompts', `${taskType}.md`));
     searchPaths.push(path.join(baseRegistry, domain, specialty, '_shared', 'prompts', `${taskType}.md`));
  }

  // 2. Domain shared prompts - USNWR nesting
  // Try USNWR/{domain} first
  searchPaths.push(path.join(baseRegistry, 'USNWR', domain, '_shared', 'prompts', `${taskType}.md`));

  // 3. Domain shared prompts - Direct (HAC or flat structure)
  searchPaths.push(path.join(baseRegistry, domain, '_shared', 'prompts', `${taskType}.md`));

  for (const fullPath of searchPaths) {
    if (fs.existsSync(fullPath)) {
      try {
        let content = fs.readFileSync(fullPath, 'utf8');
        // Strip markdown headers if present (e.g., "# Signal Enrichment Task")
        content = content.replace(/^# .*\n/g, '');
        return content.trim();
      } catch (err) {
        console.warn(`⚠️ Error reading prompt from ${fullPath}:`, err);
      }
    }
  }

  return null;
}
