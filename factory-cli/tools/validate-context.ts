/**
 * Context Validation Tool
 *
 * Validates .context/ files for:
 * - Structural correctness
 * - Cross-reference integrity
 * - Update log consistency
 * - Conflict detection
 *
 * Usage:
 *   npx ts-node tools/validate-context.ts
 *   npx ts-node tools/validate-context.ts --fix
 */

import fs from "fs/promises";
import path from "path";
import { program } from "commander";

const CONTEXT_DIR = path.join(__dirname, "../.context");

interface ValidationResult {
  file: string;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  type: "missing_file" | "invalid_structure" | "broken_link" | "missing_update_log";
  message: string;
  line?: number;
}

interface ValidationWarning {
  type: "stale_content" | "potential_conflict" | "missing_section";
  message: string;
  line?: number;
}

interface ContextUpdate {
  file: string;
  llm: string;
  date: string;
  change: string;
}

/**
 * Parse update log from a context file
 */
function parseUpdateLog(content: string): ContextUpdate[] {
  const updates: ContextUpdate[] = [];

  // Find the Update Log section
  const logMatch = content.match(/## Update Log[\s\S]*?\|[\s\S]*?\|/g);
  if (!logMatch) return updates;

  // Parse table rows
  const rows = content.match(/\| \d{4}-\d{2}-\d{2} \|[^|]+\|[^|]+\|/g);
  if (!rows) return updates;

  for (const row of rows) {
    const parts = row.split("|").map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 3) {
      updates.push({
        file: "",
        date: parts[0],
        llm: parts[1],
        change: parts[2],
      });
    }
  }

  return updates;
}

/**
 * Check if file has required sections
 */
function checkRequiredSections(content: string, fileName: string): ValidationError[] {
  const errors: ValidationError[] = [];

  const requiredSections = [
    { pattern: /^# /, message: "Missing main heading" },
    { pattern: /\*\*Last Updated:\*\*/, message: "Missing Last Updated field" },
    { pattern: /\*\*Updated By:\*\*/, message: "Missing Updated By field" },
    { pattern: /## Update Log/, message: "Missing Update Log section" },
  ];

  for (const section of requiredSections) {
    if (!section.pattern.test(content)) {
      errors.push({
        type: "invalid_structure",
        message: `${fileName}: ${section.message}`,
      });
    }
  }

  return errors;
}

/**
 * Check for internal links
 */
async function checkInternalLinks(
  content: string,
  filePath: string
): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];

  // Find markdown links to .md files
  const linkPattern = /\[([^\]]+)\]\(([^)]+\.md)\)/g;
  let match;

  while ((match = linkPattern.exec(content)) !== null) {
    const linkPath = match[2];

    // Skip external links
    if (linkPath.startsWith("http")) continue;

    // Resolve relative path
    const resolvedPath = path.resolve(path.dirname(filePath), linkPath);

    try {
      await fs.access(resolvedPath);
    } catch {
      errors.push({
        type: "broken_link",
        message: `Broken link: ${linkPath} in ${path.basename(filePath)}`,
      });
    }
  }

  return errors;
}

/**
 * Detect potential conflicts from recent updates
 */
function detectConflicts(allUpdates: ContextUpdate[]): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  // Group updates by file and date
  const updatesByFile = new Map<string, ContextUpdate[]>();

  for (const update of allUpdates) {
    const key = update.file;
    if (!updatesByFile.has(key)) {
      updatesByFile.set(key, []);
    }
    updatesByFile.get(key)!.push(update);
  }

  // Check for multiple LLMs updating same file recently
  for (const [file, updates] of updatesByFile) {
    const recentUpdates = updates.filter((u) => {
      const updateDate = new Date(u.date);
      const dayAgo = new Date();
      dayAgo.setDate(dayAgo.getDate() - 1);
      return updateDate > dayAgo;
    });

    const uniqueLLMs = new Set(recentUpdates.map((u) => u.llm));

    if (uniqueLLMs.size > 1) {
      warnings.push({
        type: "potential_conflict",
        message: `Multiple LLMs (${[...uniqueLLMs].join(", ")}) updated ${file} within 24 hours`,
      });
    }
  }

  return warnings;
}

/**
 * Validate a single context file
 */
async function validateFile(filePath: string): Promise<ValidationResult> {
  const result: ValidationResult = {
    file: path.relative(CONTEXT_DIR, filePath),
    errors: [],
    warnings: [],
  };

  try {
    const content = await fs.readFile(filePath, "utf-8");

    // Check required sections
    result.errors.push(...checkRequiredSections(content, result.file));

    // Check internal links
    result.errors.push(...(await checkInternalLinks(content, filePath)));

    // Check for stale content (no updates in 30+ days)
    const updates = parseUpdateLog(content);
    if (updates.length > 0) {
      const lastUpdate = new Date(updates[0].date);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      if (lastUpdate < thirtyDaysAgo) {
        result.warnings.push({
          type: "stale_content",
          message: `No updates in 30+ days (last: ${updates[0].date})`,
        });
      }
    }
  } catch (error) {
    result.errors.push({
      type: "missing_file",
      message: `Could not read file: ${error}`,
    });
  }

  return result;
}

/**
 * Validate all context files
 */
async function validateAll(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  // Find all .md files
  async function walkDir(dir: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        files.push(...(await walkDir(fullPath)));
      } else if (entry.name.endsWith(".md")) {
        files.push(fullPath);
      }
    }

    return files;
  }

  const mdFiles = await walkDir(CONTEXT_DIR);

  for (const file of mdFiles) {
    results.push(await validateFile(file));
  }

  return results;
}

/**
 * Check INDEX.md references all files
 */
async function validateIndex(): Promise<ValidationResult> {
  const result: ValidationResult = {
    file: "INDEX.md",
    errors: [],
    warnings: [],
  };

  try {
    const indexPath = path.join(CONTEXT_DIR, "INDEX.md");
    const indexContent = await fs.readFile(indexPath, "utf-8");

    // Get all actual files
    const categories = ["global", "architecture", "factories", "reference"];
    const actualFiles: string[] = [];

    for (const category of categories) {
      try {
        const categoryPath = path.join(CONTEXT_DIR, category);
        const files = await fs.readdir(categoryPath);
        actualFiles.push(...files.filter((f) => f.endsWith(".md")).map((f) => `${category}/${f}`));
      } catch {
        // Category doesn't exist
      }
    }

    // Check each file is referenced in INDEX
    for (const file of actualFiles) {
      if (!indexContent.includes(file)) {
        result.warnings.push({
          type: "missing_section",
          message: `File ${file} not referenced in INDEX.md`,
        });
      }
    }
  } catch (error) {
    result.errors.push({
      type: "missing_file",
      message: "INDEX.md not found",
    });
  }

  return result;
}

/**
 * Print validation results
 */
function printResults(results: ValidationResult[]): void {
  let totalErrors = 0;
  let totalWarnings = 0;

  console.log("\n Context Validation Results\n");
  console.log("=".repeat(50));

  for (const result of results) {
    if (result.errors.length === 0 && result.warnings.length === 0) {
      continue;
    }

    console.log(`\n${result.file}:`);

    for (const error of result.errors) {
      console.log(`  ERROR: ${error.message}`);
      totalErrors++;
    }

    for (const warning of result.warnings) {
      console.log(`  WARN: ${warning.message}`);
      totalWarnings++;
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log(`\nTotal: ${totalErrors} errors, ${totalWarnings} warnings`);

  if (totalErrors === 0 && totalWarnings === 0) {
    console.log("\n All context files are valid!\n");
  }
}

// CLI Setup
program
  .name("validate-context")
  .description("Validate .context/ files")
  .version("1.0.0");

program
  .command("all", { isDefault: true })
  .description("Validate all context files")
  .action(async () => {
    const results = await validateAll();
    const indexResult = await validateIndex();
    results.push(indexResult);
    printResults(results);
  });

program
  .command("file <path>")
  .description("Validate a specific context file")
  .action(async (filePath) => {
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(CONTEXT_DIR, filePath);
    const result = await validateFile(fullPath);
    printResults([result]);
  });

program
  .command("index")
  .description("Validate INDEX.md references")
  .action(async () => {
    const result = await validateIndex();
    printResults([result]);
  });

program.parse();

export { validateFile, validateAll, ValidationResult };
