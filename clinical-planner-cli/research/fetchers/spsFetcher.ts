/**
 * Solutions for Patient Safety Fetcher
 *
 * Fetches prevention bundle data from SPS
 */

import { BaseFetcher } from './baseFetcher';
import { ResearchSource, SourceContent } from '../../models/ResearchBundle';

export class SPSFetcher extends BaseFetcher {
  authority = 'Solutions for Patient Safety';
  baseUrl = 'https://www.solutionsforpatientsafety.org';

  async fetch(concernId: string, domain?: string): Promise<ResearchSource> {
    // In production, would fetch from SPS API or website
    const content = await this.fetchMockContent(concernId);

    return {
      authority: this.authority,
      title: `${concernId} Prevention Bundle`,
      version: this.extractVersion(content),
      url: `${this.baseUrl}/bundles/${concernId.toLowerCase()}`,
      fetched_at: new Date().toISOString(),
      cache_status: 'live',
      checksum: this.generateChecksum(content),
      content: this.parseContent(content)
    };
  }

  private async fetchMockContent(concernId: string): Promise<any> {
    return {
      concernId,
      version: '2024 Q4',
      bundle: {}
    };
  }

  protected parseContent(rawContent: any): SourceContent {
    const concernId = rawContent.concernId;

    switch (concernId) {
      case 'CLABSI':
        return {
          bundle_elements: [
            'Hand hygiene before line manipulation',
            'Maximal sterile barrier precautions during insertion',
            'Chlorhexidine skin preparation',
            'Optimal catheter site selection',
            'Daily line necessity review with prompt removal'
          ]
        };
      case 'CAUTI':
        return {
          bundle_elements: [
            'Catheter insertion only when necessary',
            'Sterile insertion technique',
            'Hand hygiene before manipulation',
            'Daily necessity review',
            'Prompt removal when no longer needed'
          ]
        };
      case 'VAP':
        return {
          bundle_elements: [
            'Elevate head of bed 30-45 degrees',
            'Daily sedation vacation',
            'Daily spontaneous breathing trial',
            'Peptic ulcer prophylaxis',
            'DVT prophylaxis'
          ]
        };
      case 'SSI':
        return {
          bundle_elements: [
            'Appropriate prophylactic antibiotics',
            'Timely hair removal',
            'Normothermia maintenance',
            'Glycemic control',
            'Proper surgical site prep'
          ]
        };
      default:
        return {};
    }
  }

  protected extractVersion(content: any): string {
    return content.version || '2024 Q4';
  }
}
