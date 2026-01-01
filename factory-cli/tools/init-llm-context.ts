/**
 * LLM Context Initialization Script
 *
 * Loads appropriate context files based on task type and factory.
 * Used to initialize LLM sessions with relevant project knowledge.
 *
 * Usage:
 *   npx ts-node tools/init-llm-context.ts --llm claude --task planning --factory planning-factory
 */

import fs from "fs/promises";
import path from "path";
import { program } from "commander";

const CONTEXT_DIR = path.join(__dirname, "../.context");

type LLMType = "claude" | "gemini" | "codex";
type TaskType = "planning" | "coding" | "review" | "exploration";

interface ContextLoaderOptions {
  llm: LLMType;
  task: TaskType;
  factory?: string;
  verbose?: boolean;
}

interface ContextFile {
  path: string;
  content: string;
  priority: number;
}

/**
 * Determine which context files to load based on task and factory
 */
function getContextFiles(options: ContextLoaderOptions): string[] {
  const files: string[] = [];

  // Always load core files first
  files.push("INDEX.md");
  files.push("global/llm-instructions.md");

  // Task-specific files
  switch (options.task) {
    case "planning":
      files.push("architecture/system-overview.md");
      files.push("global/workflow.md");
      break;

    case "coding":
      files.push("global/style-guide.md");
      files.push("reference/api-patterns.md");
      break;

    case "review":
      files.push("global/style-guide.md");
      files.push("global/workflow.md");
      break;

    case "exploration":
      files.push("architecture/system-overview.md");
      files.push("architecture/data-flow.md");
      break;
  }

  // Factory-specific files
  if (options.factory) {
    const factoryFile = `factories/${options.factory}.md`;
    files.push(factoryFile);
  }

  return files;
}

/**
 * Load and concatenate context files
 */
async function loadContext(options: ContextLoaderOptions): Promise<string> {
  const filesToLoad = getContextFiles(options);
  const loadedFiles: ContextFile[] = [];

  for (let i = 0; i < filesToLoad.length; i++) {
    const relativePath = filesToLoad[i];
    const fullPath = path.join(CONTEXT_DIR, relativePath);

    try {
      const content = await fs.readFile(fullPath, "utf-8");
      loadedFiles.push({
        path: relativePath,
        content,
        priority: i,
      });

      if (options.verbose) {
        console.log(`Loaded: ${relativePath}`);
      }
    } catch (error) {
      console.warn(`Warning: Could not load ${relativePath}`);
    }
  }

  // Build final context string
  const header = `# Context for ${options.llm.toUpperCase()} - ${options.task} task
${options.factory ? `Factory: ${options.factory}` : ""}
Generated: ${new Date().toISOString()}

---

`;

  const body = loadedFiles
    .map((f) => `## File: ${f.path}\n\n${f.content}`)
    .join("\n\n---\n\n");

  return header + body;
}

/**
 * List all available context files
 */
async function listContextFiles(): Promise<void> {
  console.log("\n Available Context Files:\n");

  const categories = ["global", "architecture", "factories", "reference"];

  for (const category of categories) {
    const categoryPath = path.join(CONTEXT_DIR, category);

    try {
      const files = await fs.readdir(categoryPath);
      console.log(`  ${category}/`);

      for (const file of files) {
        if (file.endsWith(".md")) {
          console.log(`    - ${file}`);
        }
      }
      console.log();
    } catch {
      // Directory doesn't exist
    }
  }
}

/**
 * Generate context summary
 */
async function summarizeContext(): Promise<void> {
  console.log("\n Context System Summary\n");
  console.log("=".repeat(50));

  const indexPath = path.join(CONTEXT_DIR, "INDEX.md");

  try {
    const indexContent = await fs.readFile(indexPath, "utf-8");

    // Extract and display key sections
    const lines = indexContent.split("\n");
    let inSection = false;

    for (const line of lines) {
      if (line.startsWith("## ")) {
        console.log(`\n${line}`);
        inSection = true;
      } else if (line.startsWith("# ")) {
        console.log(line);
      } else if (inSection && line.trim()) {
        console.log(line);
      }
    }
  } catch {
    console.log("Error: INDEX.md not found");
  }
}

// CLI Setup
program
  .name("init-llm-context")
  .description("Initialize LLM context for factory-cli tasks")
  .version("1.0.0");

program
  .command("load")
  .description("Load context files for an LLM session")
  .requiredOption("-l, --llm <type>", "LLM type (claude, gemini, codex)")
  .requiredOption("-t, --task <type>", "Task type (planning, coding, review, exploration)")
  .option("-f, --factory <name>", "Factory name (planning-factory, evals-factory, etc.)")
  .option("-o, --output <file>", "Output file (default: stdout)")
  .option("-v, --verbose", "Verbose output")
  .action(async (options) => {
    const context = await loadContext({
      llm: options.llm as LLMType,
      task: options.task as TaskType,
      factory: options.factory,
      verbose: options.verbose,
    });

    if (options.output) {
      await fs.writeFile(options.output, context);
      console.log(`Context written to: ${options.output}`);
    } else {
      console.log(context);
    }
  });

program
  .command("list")
  .description("List all available context files")
  .action(listContextFiles);

program
  .command("summary")
  .description("Show context system summary")
  .action(summarizeContext);

program.parse();

export { loadContext, getContextFiles, ContextLoaderOptions };
