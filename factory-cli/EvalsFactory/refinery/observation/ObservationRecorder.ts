import {
  ObservationRecord,
  ObservationContext,
  ObservationLevel,
  ObservationMetricName,
  ObservationValue,
} from './ObservationTypes';

/**
 * Simple singleton recorder that logs observation-only metrics.
 * Observation-only: does not alter execution or validation behavior.
 */
export class ObservationRecorder {
  private static _instance: ObservationRecorder | null = null;
  private _muted: boolean = false;

  static get instance(): ObservationRecorder {
    if (!this._instance) {
      this._instance = new ObservationRecorder();
    }
    return this._instance;
  }

  mute(): void {
    this._muted = true;
  }

  unmute(): void {
    this._muted = false;
  }

  record(record: ObservationRecord): void {
    // Deterministic mute check for refinery loops
    if (this._muted || process.env.REFINERY_QUIET === 'true') {
      return;
    }

    // Observation-only: no enforcement, no behavior change
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ kind: 'prompt_refinery_observation', ...record }));
  }

  logMetric(
    metricName: ObservationMetricName,
    level: ObservationLevel,
    context: ObservationContext,
    value: ObservationValue
  ): void {
    const timestamp = new Date().toISOString();
    this.record({
      metricName,
      level,
      context: { ...context, timestamp },
      value,
    });
  }
}

export const Observation = ObservationRecorder.instance;
export type { ObservationLevel };
