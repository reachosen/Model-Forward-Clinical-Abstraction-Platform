/**
 * Output Configuration Utility
 *
 * Centralized configuration for output directory paths.
 * All generated plans and outputs must be written to the configured output directory.
 */

import * as path from 'path';

/**
 * Get the configured output directory from .env or fallback to default
 *
 * Priority:
 * 1. OUTPUT_DIR from .env file
 * 2. Default: clinical-planner-cli/output
 *
 * @param subDir Optional subdirectory within output folder
 * @returns Absolute path to output directory
 */
export function getOutputDir(subDir?: string): string {
  // Get base output directory from .env or use default
  const baseOutputDir = process.env.OUTPUT_DIR
    ? path.join(__dirname, '..', process.env.OUTPUT_DIR)
    : path.join(__dirname, '..', 'output');

  // Return with subdirectory if specified
  return subDir ? path.join(baseOutputDir, subDir) : baseOutputDir;
}

/**
 * Get the output path for a specific plan file
 *
 * @param concernId Concern ID (e.g., CLABSI, CAUTI)
 * @param domain Domain name (e.g., picu, nicu)
 * @param filename Optional filename (default: plan.json)
 * @returns Absolute path to plan file
 */
export function getPlanOutputPath(
  concernId: string,
  domain?: string,
  filename: string = 'plan.json'
): string {
  const folderName = `${concernId.toLowerCase()}-${domain || 'general'}`;
  return path.join(getOutputDir(), folderName, filename);
}

/**
 * Validate that output directory is within clinical-planner-cli folder
 * Prevents writing files outside the project
 *
 * @param outputPath Path to validate
 * @throws Error if path is outside clinical-planner-cli
 */
export function validateOutputPath(outputPath: string): void {
  const plannerCliRoot = path.join(__dirname, '..');
  const absolutePath = path.resolve(outputPath);
  const normalizedPlannerRoot = path.resolve(plannerCliRoot);

  if (!absolutePath.startsWith(normalizedPlannerRoot)) {
    throw new Error(
      `Output path must be within clinical-planner-cli directory.\n` +
      `Attempted: ${absolutePath}\n` +
      `Required prefix: ${normalizedPlannerRoot}`
    );
  }
}
