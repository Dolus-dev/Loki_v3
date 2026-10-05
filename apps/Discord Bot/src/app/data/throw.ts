/**
 * Everything /throw says and throws: the built-in items, the message templates for each
 * outcome, and how likely each outcome is. Edit freely; the command (commands/fun/throw.ts)
 * only picks from what's here. Changes need a bot restart (/reload-commands only reloads
 * command files).
 *
 * Templates use placeholders, filled in when a throw happens:
 *   {thrower}         who used /throw
 *   {target}          who they aimed at
 *   {item}            the item (one-item and redirect throws)
 *   {item1} {item2} {item3}   the items of a double or triple throw
 *   {victim}          who a redirected throw hit instead (redirect only)
 *
 * Items are written with their article ("a rubber duck", "an anvil") so they read naturally
 * in any template; write templates so that works (not "{thrower}'s {item}" or "the {item}").
 * Servers' custom items (set in the dashboard) are used exactly as typed.
 */

/** Built-in items. Servers can add their own, or (with 20+ of their own) use only theirs. */
export const DEFAULT_THROW_ITEMS: readonly string[] = [
  'a rubber duck',
  'a pillow',
  'a water balloon',
  'a slice of pizza',
  'a snowball',
  'a banana peel',
  'a paper airplane',
  'a whoopee cushion',
  'a squeaky toy',
  'a confetti cannon',
  'a frisbee',
  'a dirty sock',
  'a pool noodle',
  'a stuffed teddy bear',
  'a handful of glitter',
  'a cream pie',
  'a rubber chicken',
  'a beach ball',
  'a wet sponge',
  'a giant marshmallow',
  'a foam sword',
  'a boomerang',
  'a bag of popcorn',
  'a slime ball',
  'a single grape',
  'a cardboard box',
  'a tennis ball',
  'a bouquet of flowers',
  'a fortune cookie',
  'a jelly donut',
  'a party hat',
  'a garden gnome',
  'a wedding ring',
  'divorce papers',
  'a dodgeball',
  'a bucket of confetti',
  'a lucky horseshoe',
  'a fluffy cloud',
  'a tiny cactus (ouch)',
  'a wheel of cheese',
  'a cartoon sized anvil',
  'an extremely judgemental cat',
];

export type ThrowOutcome = 'single' | 'double' | 'triple' | 'redirect';

/**
 * How often each outcome happens, as relative weights (they don't need to add up to 100).
 * A redirect only happens when the server enabled it and an opted-in member is around;
 * otherwise that roll becomes a single throw.
 */
export const THROW_OUTCOME_WEIGHTS: Record<ThrowOutcome, number> = {
  single: 60,
  double: 18,
  triple: 7,
  redirect: 15,
};

export const THROW_TEMPLATES: Record<ThrowOutcome, readonly string[]> = {
  // One item, straight at the target
  single: [
    '{thrower} threw {item} at {target}!',
    '{thrower} winds up and launches {item} right at {target}. Direct hit!',
    '{target} never saw it coming: {thrower} just threw {item} at them.',
    'Incoming! {thrower} lobbed {item} at {target}.',
    '{thrower} took careful aim and threw {item} at {target}. Bullseye!',
    'With a mighty heave, {thrower} sends {item} flying toward {target}.',
  ],

  // Two items at once
  double: [
    '{thrower} threw {item1} AND {item2} at {target}. Double trouble!',
    'Two-for-one deal: {thrower} hurled {item1} and {item2} at {target}!',
    '{thrower} is ambidextrous! {item1} and {item2} both fly at {target}.',
    '{target} dodged {item1} from {thrower}, but {item2} hit right on target!',
    'A double throw! {thrower} sends {item1} and then {item2} straight at {target}.',
    '{thrower} grabbed {item1} and {item2} and let {target} have both.',
  ],

  // Three items at once
  triple: [
    '{thrower} unleashed a barrage on {target}: {item1}, {item2} AND {item3}!',
    'TRIPLE THROW! {thrower} hit {target} with {item1}, {item2} and {item3}.',
    '{thrower} emptied their pockets at {target}: {item1}, {item2}, and somehow {item3}.',
    "It's raining items on {target}! {thrower} threw {item1}, {item2} and {item3}.",
    'Combo! {thrower} chains {item1} into {item2} into {item3}, all at {target}.',
    '{thrower} went all out: {item1}, {item2} and {item3} are flying at {target}!',
  ],

  // The throw missed and hit someone else
  redirect: [
    '{thrower} threw {item} at {target}... but it bounced off and hit {victim} instead!',
    'Oops! {thrower} aimed {item} at {target}, but {victim} walked right into it.',
    '{target} ducked! {thrower} threw {item}, and it sailed right past onto {victim}.',
    '{thrower} slipped mid-throw, and {item} meant for {target} hit {victim}. Sorry, {victim}!',
    'A wild ricochet! {thrower} threw {item} at {target}, and it ended up hitting {victim}.',
    '{target} caught {item} from {thrower} and tossed it straight to {victim}. Teamwork!',
  ],
};
