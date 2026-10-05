/**
 * Durations as moderators type them in commands, e.g. "30m", "12h", "7d", "1w" or
 * "1d12h". All durations are whole seconds; 0 means permanent.
 */

const UNIT_SECONDS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 60 * 60,
  d: 24 * 60 * 60,
  w: 7 * 24 * 60 * 60,
};

const PERMANENT_WORDS = new Set(['0', 'perm', 'permanent', 'forever', 'never']);

/** Longest duration accepted. Anything longer is effectively permanent, so say so instead. */
export const MAX_DURATION_SECONDS = 10 * 365 * 24 * 60 * 60;

export type ParsedDuration = { ok: true; seconds: number } | { ok: false; error: string };

/**
 * Parses a duration like "2h", "1d12h" or "1w 2d" (units: s, m, h, d, w; case and spaces
 * don't matter). "permanent", "perm", "forever" or "0" give 0, i.e. permanent.
 */
export function parseDuration(input: string): ParsedDuration {
  const text = input.trim().toLowerCase().replace(/\s+/g, '');

  if (PERMANENT_WORDS.has(text)) {
    return { ok: true, seconds: 0 };
  }

  // The whole input must be number+unit pairs, e.g. "1d12h"; anything else is rejected
  if (!/^(\d+[smhdw])+$/.test(text)) {
    return {
      ok: false,
      error: `"${input}" isn't a duration. Use a number and a unit, like \`30m\`, \`12h\`, \`7d\`, \`1w\` or \`1d12h\`, or \`permanent\`.`,
    };
  }

  let seconds = 0;
  for (const [, amount, unit] of text.matchAll(/(\d+)([smhdw])/g)) {
    seconds += Number(amount) * UNIT_SECONDS[unit!]!;
  }

  if (seconds === 0) {
    return { ok: true, seconds: 0 };
  }
  if (seconds > MAX_DURATION_SECONDS) {
    return { ok: false, error: 'That duration is longer than 10 years. Use `permanent` instead.' };
  }
  return { ok: true, seconds };
}

const DISPLAY_UNITS: [name: string, seconds: number][] = [
  ['week', UNIT_SECONDS.w!],
  ['day', UNIT_SECONDS.d!],
  ['hour', UNIT_SECONDS.h!],
  ['minute', UNIT_SECONDS.m!],
  ['second', 1],
];

/** Writes a duration out in words, largest units first: 129600 → "1 day 12 hours"; 0 → "permanent". */
export function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) {
    return 'permanent';
  }

  const parts: string[] = [];
  let remaining = totalSeconds;
  for (const [name, unitSeconds] of DISPLAY_UNITS) {
    const amount = Math.floor(remaining / unitSeconds);
    if (amount > 0) {
      parts.push(`${amount} ${name}${amount === 1 ? '' : 's'}`);
      remaining -= amount * unitSeconds;
    }
  }
  return parts.join(' ');
}

/**
 * A Discord timestamp: shown to each reader in their own timezone and language.
 * Style "F" is the full date and time ("Tuesday, 6 October 2026 14:00"), "R" is relative
 * ("in 7 days").
 */
export function discordTimestamp(date: Date, style: 'F' | 'R' = 'F'): string {
  return `<t:${Math.floor(date.getTime() / 1000)}:${style}>`;
}
