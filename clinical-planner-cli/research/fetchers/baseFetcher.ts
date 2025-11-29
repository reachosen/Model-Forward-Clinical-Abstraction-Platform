/**
 * Base Fetcher Class
 *
 * Abstract base class for research source fetchers
 */

import * as crypto from 'crypto';
import { ResearchSource } from '../../models/ResearchBundle';

export abstract class BaseFetcher {
  abstract authority: string;
  abstract baseUrl: string;

  /**
   * Fetch research data for a given concern
   */
  abstract fetch(concernId: string, domain?: string): Promise<ResearchSource>;

  /**
   * Fetch with retry logic and exponential backoff
   */
  protected async fetchWithRetry(
    url: string,
    retries: number = 3,
    timeout: number = 10000
  ): Promise<any> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        console.log(`   Attempt ${attempt + 1}/${retries}: Fetching ${url}`);

        // Add timeout support
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'HAC-Planner-CLI/2.0'
          }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type');

        if (contentType?.includes('application/json')) {
          return await response.json();
        } else if (contentType?.includes('text/html')) {
          return await response.text();
        } else {
          // PDF or other binary content
          return await response.arrayBuffer();
        }
      } catch (error: any) {
        lastError = error;
        console.warn(`   Attempt ${attempt + 1} failed: ${error.message}`);

        if (attempt < retries - 1) {
          // Exponential backoff: 1s, 2s, 4s
          const backoff = Math.pow(2, attempt) * 1000;
          console.log(`   Retrying in ${backoff}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoff));
        }
      }
    }

    throw new Error(`Failed after ${retries} attempts: ${lastError?.message}`);
  }

  /**
   * Generate SHA-256 checksum for content verification
   */
  protected generateChecksum(content: any): string {
    const contentStr = typeof content === 'string'
      ? content
      : JSON.stringify(content);

    return crypto
      .createHash('sha256')
      .update(contentStr)
      .digest('hex');
  }

  /**
   * Extract version from content (override in subclasses)
   */
  protected extractVersion(content: any): string {
    return 'latest';
  }

  /**
   * Parse content into structured format (override in subclasses)
   */
  protected abstract parseContent(rawContent: any): any;
}
