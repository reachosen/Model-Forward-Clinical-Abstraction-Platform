/**
 * Base Clinical Tool
 *
 * Abstract base class for clinical calculation tools
 */

export interface ClinicalToolResult {
  [key: string]: any;
  provenance: {
    tool: string;
    version: string;
    url: string;
  };
}

export abstract class BaseClinicalTool {
  abstract tool_id: string;
  abstract tool_name: string;
  abstract version: string;
  abstract url: string;
  abstract pediatric_validated: boolean;

  /**
   * Calculate result from inputs
   */
  abstract calculate(inputs: any): ClinicalToolResult;

  /**
   * Generate signals from calculation result (optional)
   */
  generateSignals?(result: ClinicalToolResult): any[];

  /**
   * Get tool metadata
   */
  getMetadata() {
    return {
      tool_id: this.tool_id,
      tool_name: this.tool_name,
      version: this.version,
      url: this.url,
      pediatric_validated: this.pediatric_validated
    };
  }
}
