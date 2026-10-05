/**
 * Durations as moderators type them in commands. All durations are whole seconds.
 *
 * Accepted, in any mix of upper/lower case:
 *   short:    "30m", "12h", "7d", "1w", "1d12h"
 *   verbose:  "30 minutes", "2 hrs", "1 week, 2 days and 6 hours", "an hour", "a day"
 *
 * Units: s/sec/secs/second/seconds, m/min/mins/minute/minutes, h/hr/hrs/hour/hours,
 * d/day/days, w/wk/wks/week/weeks, mo/month/months (30 days), y/yr/yrs/year/years (365 days).
 * Parts can be joined by nothing, spaces, commas or "and".
 *
 * Each command decides which words mean "zero" (e.g. "permanent" for a ban's length, "none"
 * for how many messages to delete) and the longest duration it accepts.
 */

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

const UNIT_SECONDS: Record<string, number> = {
  s: 1, sec: 1, secs: 1, second: 1, seconds: 1,
  m: MINUTE, min: MINUTE, mins: MINUTE, minute: MINUTE, minutes: MINUTE,
  h: HOUR, hr: HOUR, hrs: HOUR, hour: HOUR, hours: HOUR,
  d: DAY, day: DAY, days: DAY,
  w: WEEK, wk: WEEK, wks: WEEK, week: WEEK, weeks: WEEK,
  mo: MONTH, month: MONTH, months: MONTH,
  y: YEAR, yr: YEAR, yrs: YEAR, year: YEAR, years: YEAR,
}; // prettier-ignore

export const SECONDS_PER = { minute: MINUTE, hour: HOUR, day: DAY, week: WEEK, month: MONTH, year: YEAR } as const;

export interface DurationRules {
  /** Words that mean 0, e.g. ["permanent", "perm"] for a ban's length. "0" always means 0. */
  zeroWords: readonly string[];
  /** Longest accepted duration, in seconds. */
  maxSeconds: number;
  /** Shown when the input is longer than `maxSeconds`. */
  tooLongMessage: string;
}

export type ParsedDuration = { ok: true; seconds: number } | { ok: false; error: string };

// One part: an amount ("12", or the whole word "a"/"an" for 1) followed by a unit word.
// The \b's keep the "a" in "abc" from being read as "a" + unit "bc".
const PART = /(\d+|\ban?\b)\s*([a-z]+)/g;

/** Parses a duration typed by a moderator; see the file comment for what's accepted. */
export function parseDuration(input: string, rules: DurationRules): ParsedDuration {
  const text = input
    .trim()
    .toLowerCase()
    .replace(/,|\band\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (text === '0' || rules.zeroWords.includes(text)) {
    return { ok: true, seconds: 0 };
  }

  const hint = `Try something like \`30m\`, \`12 hours\`, \`7d\` or \`1 week 2 days\`.`;

  // Everything typed must be part of an amount+unit pair: remove the pairs and check that
  // nothing else is left over (rejects "5", "abc", "1d x")
  if (text.length === 0 || text.replace(PART, '').trim() !== '') {
    return { ok: false, error: `"${input}" isn't a duration. ${hint}` };
  }

  let seconds = 0;
  for (const [, amount, unit] of text.matchAll(PART)) {
    const unitSeconds = UNIT_SECONDS[unit!];
    if (unitSeconds === undefined) {
      return { ok: false, error: `"${unit}" isn't a unit I know. ${hint}` };
    }
    seconds += (amount === 'a' || amount === 'an' ? 1 : Number(amount)) * unitSeconds;
  }

  if (seconds > rules.maxSeconds) {
    return { ok: false, error: rules.tooLongMessage };
  }
  return { ok: true, seconds };
}

const DISPLAY_UNITS: [name: string, seconds: number][] = [
  ['year', YEAR],
  ['month', MONTH],
  ['week', WEEK],
  ['day', DAY],
  ['hour', HOUR],
  ['minute', MINUTE],
  ['second', 1],
];

/**
 * Writes a duration out in words, largest units first: 129600 → "1 day 12 hours".
 * @param zeroText What to write for 0, e.g. "permanent"
 */
export function formatDuration(totalSeconds: number, zeroText = '0 seconds'): string {
  if (totalSeconds <= 0) {
    return zeroText;
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

/** A suggestion for a duration option's autocomplete: `name` is shown, `value` is submitted. */
export interface DurationChoice {
  name: string;
  value: string;
}

/**
 * Autocomplete suggestions for a duration option, as the moderator types.
 *
 * If what they typed parses, the first suggestion shows how it was understood (e.g. "1d12h"
 * → "1 day 12 hours"), so they can confirm before running the command; if it doesn't parse,
 * the first one shows why. The presets that match what they typed follow. Discord allows at
 * most 25 suggestions of up to 100 characters each.
 */
export function durationChoices(
  typed: string,
  rules: DurationRules,
  presets: readonly DurationChoice[],
  zeroText: string,
): DurationChoice[] {
  const query = typed.trim();
  if (!query) {
    return presets.slice(0, 25);
  }

  const parsed = parseDuration(query, rules);
  const first: DurationChoice = parsed.ok
    ? { name: `→ ${formatDuration(parsed.seconds, zeroText)}`, value: query }
    : { name: `⚠ ${parsed.error.replace(/`/g, '')}`, value: query };

  const lowered = query.toLowerCase();
  const matching = presets.filter(
    (preset) => preset.name.toLowerCase().includes(lowered) || preset.value.toLowerCase().startsWith(lowered),
  );

  return [first, ...matching]
    .slice(0, 25)
    .map((choice) => ({ name: choice.name.slice(0, 100), value: choice.value.slice(0, 100) }));
}

/**
 * A Discord timestamp: shown to each reader in their own timezone and language.
 * Style "F" is the full date and time ("Tuesday, 6 October 2026 14:00"), "R" is relative
 * ("in 7 days").
 */
export function discordTimestamp(date: Date, style: 'F' | 'R' = 'F'): string {
  return `<t:${Math.floor(date.getTime() / 1000)}:${style}>`;
}
