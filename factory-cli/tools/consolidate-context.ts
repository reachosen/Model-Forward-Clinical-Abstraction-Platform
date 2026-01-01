/**
 * Context Consolidation Tool
 *
 * Helps migrate content from legacy documentation to .context/ files.
 * Extracts LLM-relevant content from existing READMEs and consolidates
 * into the appropriate .context/ location.
 *
 * Usage:
 *   npx ts-node tools/consolidate-context.ts scan
 *   npx ts-node tools/consolidate-context.ts migrate --file ARCHITECTURE.md
 */

import fs from "fs/promises";
import path from "path";
import { program } from "commander";

const PROJECT_ROOT = path.join(__dirname, "../..");
const FACTORY_CLI = path.join(__dirname, "..");
const CONTEXT_DIR = path.join(FACTORY_CLI, ".context");

interface SourceFile {
  path: string;
  relativePath: string;
  type: "readme" | "architecture" | "guide" | "reference";
  suggestedTarget: string;
}

interface MigrationPlan {
  source: string;
  target: string;
  sections: string[];
  status: "pending" | "migrated" | "skipped";
}

/**
 * Scan for documentation files that could be consolidated
 */
async function scanForDocumentation(): Promise<SourceFile[]> {
  const sources: SourceFile[] = [];

  // Known documentation locations
  const searchPaths = [
    { dir: PROJECT_ROOT, pattern: "*.md" },
    { dir: FACTORY_CLI, pattern: "*.md" },
    { dir: path.join(FACTORY_CLI, "PlanningFactory"), pattern: "*.md" },
    { dir: path.join(FACTORY_CLI, "EvalsFactory"), pattern: "*.md" },
    { dir: path.join(FACTORY_CLI, "SchemaFactory"), pattern: "*.md" },
    { dir: path.join(PROJECT_ROOT, "docs"), pattern: "**/*.md" },
  ];

  for (const search of searchPaths) {
    try {
      const files = await fs.readdir(search.dir);

      for (const file of files) {
        if (!file.endsWith(".md")) continue;

        const fullPath = path.join(search.dir, file);
        const stat = await fs.stat(fullPath);

        if (!stat.isFile()) continue;

        // Determine type and suggested target
        const type = categorizeFile(file);
        const target = suggestTarget(file, search.dir);

        sources.push({
          path: fullPath,
          relativePath: path.relative(PROJECT_ROOT, fullPath),
          type,
          suggestedTarget: target,
        });
      }
    } catch {
      // Directory doesn't exist
    }
  }

  return sources;
}

/**
 * Categorize a documentation file
 */
function categorizeFile(fileName: string): SourceFile["type"] {
  const name = fileName.toLowerCase();

  if (name === "readme.md") return "readme";
  if (name.includes("architecture")) return "architecture";
  if (name.includes("guide") || name.includes("how")) return "guide";
  return "reference";
}

/**
 * Suggest a .context/ target for a file
 */
function suggestTarget(fileName: string, sourceDir: string): string {
  const name = fileName.toLowerCase();
  const dirName = path.basename(sourceDir).toLowerCase();

  // Factory-specific files
  if (dirName === "planningfactory") return "factories/planning-factory.md";
  if (dirName === "evalsfactory") return "factories/evals-factory.md";
  if (dirName === "schemafactory") return "factories/schema-factory.md";

  // Architecture files
  if (name.includes("architecture")) return "architecture/system-overview.md";
  if (name.includes("flow") || name.includes("matrix")) return "architecture/data-flow.md";

  // Guide files
  if (name.includes("learning")) return "reference/api-patterns.md";
  if (name.includes("batch") || name.includes("runner")) return "reference/api-patterns.md";

  // Default to reference
  return "reference/domain-models.md";
}

/**
 * Extract sections from a markdown file
 */
async function extractSections(filePath: string): Promise<string[]> {
  const content = await fs.readFile(filePath, "utf-8");
  const sections: string[] = [];

  // Find all H2 headings
  const headingPattern = /^## (.+)$/gm;
  let match;

  while ((match = headingPattern.exec(content)) !== null) {
    sections.push(match[1]);
  }

  return sections;
}

/**
 * Generate migration report
 */
async function generateMigrationReport(sources: SourceFile[]): Promise<void> {
  console.log("\n Documentation Migration Report\n");
  console.log("=".repeat(60));

  const byTarget = new Map<string, SourceFile[]>();

  for (const source of sources) {
    if (!byTarget.has(source.suggestedTarget)) {
      byTarget.set(source.suggestedTarget, []);
    }
    byTarget.get(source.suggestedTarget)!.push(source);
  }

  for (const [target, files] of byTarget) {
    console.log(`\n${target}:`);

    for (const file of files) {
      const sections = await extractSections(file.path);
      console.log(`  - ${file.relativePath}`);

      if (sections.length > 0) {
        console.log(`    Sections: ${sections.slice(0, 3).join(", ")}${sections.length > 3 ? "..." : ""}`);
      }
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log(`\nTotal: ${sources.length} files to review`);
}

/**
 * Create migration marker in source file
 */
async function addMigrationMarker(
  sourcePath: string,
  targetPath: string
): Promise<void> {
  const content = await fs.readFile(sourcePath, "utf-8");

  const marker = `
---

> **Note**: LLM-relevant content from this file has been migrated to:
> \`.context/${targetPath}\`
>
> This file is kept for human readers. See \`.context/INDEX.md\` for the
> consolidated documentation system.

---

`;

  // Add marker after first heading
  const updatedContent = content.replace(/^(# .+\n)/, `$1${marker}`);

  await fs.writeFile(sourcePath, updatedContent);
}

/**
 * Append content to target context file
 */
async function appendToContextFile(
  targetPath: string,
  content: string,
  sourcePath: string
): Promise<void> {
  const fullTargetPath = path.join(CONTEXT_DIR, targetPath);

  try {
    const existingContent = await fs.readFile(fullTargetPath, "utf-8");

    // Find the Update Log section and insert before it
    const updateLogIndex = existingContent.indexOf("## Update Log");

    if (updateLogIndex !== -1) {
      const before = existingContent.slice(0, updateLogIndex);
      const after = existingContent.slice(updateLogIndex);

      const migrationNote = `
---

## Migrated from ${sourcePath}
[Claude | ${new Date().toISOString().split("T")[0]}]

${content}

`;

      const updatedContent = before + migrationNote + after;
      await fs.writeFile(fullTargetPath, updatedContent);
    }
  } catch {
    console.error(`Error appending to ${targetPath}`);
  }
}

// CLI Setup
program
  .name("consolidate-context")
  .description("Consolidate documentation into .context/ system")
  .version("1.0.0");

program
  .command("scan")
  .description("Scan for documentation files to consolidate")
  .action(async () => {
    const sources = await scanForDocumentation();
    await generateMigrationReport(sources);
  });

program
  .command("preview <file>")
  .description("Preview sections in a documentation file")
  .action(async (file) => {
    const fullPath = path.isAbsolute(file) ? file : path.join(PROJECT_ROOT, file);
    const sections = await extractSections(fullPath);

    console.log(`\nSections in ${file}:\n`);
    sections.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
  });

program
  .command("mark <file>")
  .description("Add migration marker to a file")
  .requiredOption("-t, --target <path>", "Target context file path")
  .action(async (file, options) => {
    const fullPath = path.isAbsolute(file) ? file : path.join(PROJECT_ROOT, file);
    await addMigrationMarker(fullPath, options.target);
    console.log(`Added migration marker to ${file}`);
  });

program.parse();

export { scanForDocumentation, extractSections };
