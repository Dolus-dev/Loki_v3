import { defineCommand } from '../../../framework/types.js';
import {
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Guild,
  type GuildMember,
} from 'discord.js';
import { Logger } from '../../../framework/logger.js';
import { getThrowSettings, type ThrowSettings } from '../../lib/backend.js';
import { formatDuration } from '../../lib/duration.js';
import { DEFAULT_THROW_ITEMS, THROW_OUTCOME_WEIGHTS, THROW_TEMPLATES, type ThrowOutcome } from '../../data/throw.js';

/** "Disable Default Items" only kicks in once a server has at least this many custom items. */
const MIN_CUSTOM_ITEMS_FOR_CUSTOM_ONLY = 20;

/**
 * When each member last threw, per server ("guildId:userId" → timestamp in ms). Kept in
 * memory: a bot restart resets everyone's cooldown, which is fine for a fun command.
 */
const lastThrowAt = new Map<string, number>();

/**
 * /throw: a fun command where members throw things at each other.
 *
 * Content (items, message templates, outcome odds) lives in data/throw.ts. Each server's
 * settings (Fun → Throw Command in the dashboard) decide:
 * - which items: the built-in ones, plus the server's custom items when enabled; only the
 *   custom ones when "Disable Default Items" is on and there are at least 20;
 * - where it works: if a channel whitelist is set, only there; otherwise anywhere except
 *   blacklisted channels (a thread follows its parent channel's rule);
 * - how often: a per-member cooldown;
 * - redirects: when on, a throw can bounce onto a random member with an opt-in role.
 *
 * Each throw rolls an outcome (see THROW_OUTCOME_WEIGHTS): one item, two, three, or a
 * redirect. The result is posted publicly and pings whoever got hit (the target, or on a
 * redirect also the member it landed on); nothing else in the message can ping. Problems
 * (cooldown, wrong channel) are replied to privately.
 */
export default defineCommand({
  data: new SlashCommandBuilder()
    .setName('throw')
    .setDescription('Throw something at another member!')
    .setContexts(InteractionContextType.Guild) // Only makes sense in a server, not in DMs
    .addUserOption((option) => option.setName('target').setDescription('Who to throw something at.').setRequired(true)),

  async execute(interaction) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({ content: 'This command can only be used in a server.', flags: MessageFlags.Ephemeral });
      return;
    }

    const { guild, member: thrower } = interaction;
    const target = interaction.options.getMember('target');

    if (!target) {
      await privateReply(interaction, "That user isn't in this server, so they're out of range.");
      return;
    }
    if (target.id === thrower.id) {
      await privateReply(interaction, 'Throwing things at yourself? Pick someone else as your target!');
      return;
    }

    let settings: ThrowSettings;
    try {
      settings = await getThrowSettings(guild.id);
    } catch (error) {
      Logger.error(`Couldn't load throw settings for guild ${guild.id}:`, error);
      await privateReply(interaction, "Couldn't load this server's throw settings. Please try again in a moment.");
      return;
    }

    // Where it works
    const channelProblem = whyCantThrowHere(interaction, settings);
    if (channelProblem) {
      await privateReply(interaction, channelProblem);
      return;
    }

    // How often
    const cooldownKey = `${guild.id}:${thrower.id}`;
    if (settings.cooldownSeconds > 0) {
      const readyAt = (lastThrowAt.get(cooldownKey) ?? 0) + settings.cooldownSeconds * 1000;
      if (Date.now() < readyAt) {
        const secondsLeft = Math.ceil((readyAt - Date.now()) / 1000);
        await privateReply(interaction, `You're out of breath! You can throw again in ${formatDuration(secondsLeft)}.`);
        return;
      }
    }

    // What to throw, and what happens
    const items = itemPool(settings);
    const victim = settings.redirectEnabled ? pickRedirectVictim(guild, settings, thrower, target) : null;
    // A redirect needs someone to land on; without one, that roll is a normal single throw
    let outcome = rollOutcome();
    if (outcome === 'redirect' && !victim) {
      outcome = 'single';
    }

    const [item1, item2, item3] = pickDistinct(items, outcome === 'triple' ? 3 : outcome === 'double' ? 2 : 1);
    const message = fillTemplate(pickOne(THROW_TEMPLATES[outcome]), {
      thrower: `${thrower}`,
      target: `${target}`,
      item: item1 ?? 'something',
      item1: item1 ?? 'something',
      item2: item2 ?? item1 ?? 'something',
      item3: item3 ?? item1 ?? 'something',
      victim: victim ? `${victim}` : `${target}`,
    });

    lastThrowAt.set(cooldownKey, Date.now());

    // Ping whoever got hit: the target, and on a redirect the member it bounced onto. Listing
    // them explicitly means nothing else in the message can ping, e.g. @everyone or a role
    // inside a server's custom item.
    const pinged = outcome === 'redirect' && victim ? [target.id, victim.id] : [target.id];
    await interaction.reply({ content: message, allowedMentions: { users: pinged } });
  },
});

async function privateReply(interaction: ChatInputCommandInteraction, content: string): Promise<void> {
  await interaction.reply({ content, flags: MessageFlags.Ephemeral });
}

/**
 * Checks the channel rules. Threads follow their parent channel, so whitelisting #general also
 * allows threads in #general.
 * @returns Why /throw can't be used here, or null if it can
 */
function whyCantThrowHere(interaction: ChatInputCommandInteraction<'cached'>, settings: ThrowSettings): string | null {
  const channel = interaction.channel;
  const channelIds = [interaction.channelId, channel?.isThread() ? channel.parentId : null].filter((id): id is string =>
    Boolean(id),
  );
  const inAny = (list: string[]) => channelIds.some((id) => list.includes(id));

  if (settings.whitelistedChannels.length > 0) {
    if (!inAny(settings.whitelistedChannels)) {
      const allowed = settings.whitelistedChannels.map((id) => `<#${id}>`).join(', ');
      return `/throw can only be used in: ${allowed}`;
    }
    return null;
  }
  if (inAny(settings.blacklistedChannels)) {
    return "/throw can't be used in this channel.";
  }
  return null;
}

/** The items this server throws: see the command's description for the rules. */
function itemPool(settings: ThrowSettings): readonly string[] {
  const custom = settings.customItemsEnabled ? settings.customItems.filter((item) => item.trim().length > 0) : [];
  if (settings.customItemsOnly && custom.length >= MIN_CUSTOM_ITEMS_FOR_CUSTOM_ONLY) {
    return custom;
  }
  return [...DEFAULT_THROW_ITEMS, ...custom];
}

/**
 * Picks who a redirected throw hits: a random member holding one of the opt-in roles, other
 * than the thrower, the target and bots. No opt-in roles means nobody opted in.
 *
 * Uses the bot's member cache (filled through the GuildMembers intent) rather than fetching
 * every member, so a member the bot hasn't seen since it started may be skipped.
 */
function pickRedirectVictim(
  guild: Guild,
  settings: ThrowSettings,
  thrower: GuildMember,
  target: GuildMember,
): GuildMember | null {
  const candidates = new Map<string, GuildMember>();
  for (const roleId of settings.redirectOptInRoleIds) {
    for (const [id, member] of guild.roles.cache.get(roleId)?.members ?? []) {
      if (id !== thrower.id && id !== target.id && !member.user.bot) {
        candidates.set(id, member);
      }
    }
  }
  return candidates.size > 0 ? pickOne([...candidates.values()]) : null;
}

/** Rolls an outcome, weighted by THROW_OUTCOME_WEIGHTS. */
function rollOutcome(): ThrowOutcome {
  const entries = Object.entries(THROW_OUTCOME_WEIGHTS) as [ThrowOutcome, number][];
  const total = entries.reduce((sum, [, weight]) => sum + Math.max(weight, 0), 0);
  let roll = Math.random() * total;
  for (const [outcome, weight] of entries) {
    roll -= Math.max(weight, 0);
    if (roll < 0) {
      return outcome;
    }
  }
  return 'single';
}

function pickOne<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)]!;
}

/** Picks up to `count` different items (fewer if the list is shorter). */
function pickDistinct(list: readonly string[], count: number): string[] {
  const pool = [...list];
  const picked: string[] = [];
  while (picked.length < count && pool.length > 0) {
    picked.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]!);
  }
  return picked;
}

/**
 * Fills a template's {placeholders}. Values are inserted in one pass, so an item that itself
 * contains "{target}" isn't expanded again; unknown placeholders are left as written.
 */
function fillTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (placeholder, key: string) =>
    Object.hasOwn(values, key) ? values[key]! : placeholder,
  );
}
