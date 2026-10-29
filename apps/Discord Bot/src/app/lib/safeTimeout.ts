const MAX_TIMEOUT_MS = 2 ** 31 - 1; // 2,147,483,647 (the maximum setTimeout can handle)

export interface SafeTimeout {
  cancel(): void;
}

/**
 * Like setTimeout, but can handle delays longer than ~24.8 days, by chaining timers until the remaining delay fits in one.
 * @param callback The callback to run after the delay. If the timer is cancelled, it won't be called.
 * @param delay The delay in milliseconds. Can be longer than 2,147,483,647 (the maximum setTimeout can handle).
 */
export function safeTimeout(callback: () => void, delay: number): SafeTimeout {
  if (!Number.isFinite(delay)) {
    throw new RangeError(`safeTimeout needs a finite delay, got ${delay}`);
  }

  const firesAt = Date.now() + Math.max(0, delay);
  let timer: NodeJS.Timeout | undefined;

  const wait = () => {
    const remaining = firesAt - Date.now();
    timer =
      remaining > MAX_TIMEOUT_MS ? setTimeout(wait, MAX_TIMEOUT_MS) : setTimeout(callback, Math.max(0, remaining));
  };

  wait();

  return {
    cancel() {
      clearTimeout(timer);
    },
  };
}
