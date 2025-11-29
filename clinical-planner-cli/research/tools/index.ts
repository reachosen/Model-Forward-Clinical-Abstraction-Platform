/**
 * Clinical Tools Export
 */

export { BaseClinicalTool, ClinicalToolResult } from './baseTool';
export { KDIGOAKIStaging, KDIGOInputs, KDIGOResult } from './kdigo';

// Register all available tools
import { KDIGOAKIStaging } from './kdigo';

export const CLINICAL_TOOLS = {
  'kdigo-aki-staging': KDIGOAKIStaging
};

export function getClinicalTool(toolId: string): any {
  return CLINICAL_TOOLS[toolId as keyof typeof CLINICAL_TOOLS];
}
