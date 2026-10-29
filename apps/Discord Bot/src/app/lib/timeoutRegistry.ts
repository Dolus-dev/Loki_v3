import { Logger } from '../../framework/logger.js';
import { safeTimeout, type SafeTimeout } from './safeTimeout.js';

/**
 * Pending timers by key, so they can be cancelled or replaced. Each key can have at most one timer at a time.
 */
export class TimeoutRegistry {
  private readonly timers = new Map<string, SafeTimeout>();

  schedule(key: string, delay: number, callback: () => void | Promise<void>): void {
    this.cancel(key);

    const timer = safeTimeout(() => {
      this.timers.delete(key);

      Promise.resolve()
        .then(callback)
        .catch((error) => {
          Logger.error(`Scheduled task "${key}" failed: `, error);
        });
    }, delay);
    this.timers.set(key, timer);
  }

  /**
   * Cancels the timer under `key`, if any.
   * @param key
   * @returns Whether there was a pending timer to cancel
   */
  cancel(key: string): boolean {
    const timer = this.timers.get(key);
    if (!timer) {
      return false;
    }
    timer.cancel();
    this.timers.delete(key);
    return true;
  }

  /**
   * Whether a timer is pending under `key`.
   */
  has(key: string): boolean {
    return this.timers.has(key);
  }

  /** Cancels every pending timer. */
  cancelAll(): void {
    for (const timer of this.timers.values()) {
      timer.cancel();
    }
    this.timers.clear();
  }
}
