import { defineCommand } from '../../../framework/types.js';
import {
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type Guild,
  type GuildMember,
  type PermissionsBitField,
} from 'discord.js';
import { Logger } from '../../../framework/logger.js';
import {
  createModerationEvent,
  getModerationActionSettings,
  type ModerationActionSettings,
} from '../../lib/backend.js';
import {
  discordTimestamp,
  durationChoices,
  formatDuration,
  parseDuration,
  SECONDS_PER,
  type DurationChoice,
  type DurationRules,
} from '../../lib/duration.js';
import { sendModerationNotice } from '../../lib/moderationNotices.js';

// The backend stores reasons up to 512 characters, and Discord's audit log has the same limit
const MAX_REASON_LENGTH = 512;

// Discord's limit on how long a timeout can last
const MAX_TIMEOUT_SECONDS = 28 * SECONDS_PER.day;

/** The timeout settings from the dashboard (Moderation → Timeouts). */
interface TimeoutSettings extends ModerationActionSettings {
  /** Used when /timeout is run without a duration. 0 = no default: a duration is required. */
  defaultTimeoutDurationSeconds: number;
}

/**
 * The `duration` option. Timeouts can't be permanent (Discord doesn't allow it), so there are
 * no "permanent" words, and 0 is rejected in `execute`.
 */
const TIMEOUT_DURATION_RULES: DurationRules = {
  zeroWords: [],
  maxSeconds: MAX_TIMEOUT_SECONDS,
  tooLongMessage: 'Discord limits timeouts to 28 days. Use `28d` or less.',
};
const TIMEOUT_DURATION_PRESETS: DurationChoice[] = [
  { name: '60 seconds', value: '60s' },
  { name: '5 minutes', value: '5m' },
  { name: '10 minutes', value: '10m' },
  { name: '1 hour', value: '1h' },
  { name: '1 day', value: '1d' },
  { name: '1 week', value: '1w' },
  { name: '28 days (the maximum)', value: '28d' },
];

/**
 * /timeout: puts a member in Discord's built-in timeout (they can read, but can't send
 * messages, react or join voice) and records it in their moderation history.
 *
 * Discord lifts the timeout by itself when it runs out; the expiry processor then only marks
 * the record as ended (see lib/expiryProcessor.ts), without notifying the member.
 *
 * Steps, in order:
 *   1. Load the timeout settings (Moderation → Timeouts in the dashboard) and enforce them:
 *      timeouts enabled, reason/evidence required. They also give the default duration.
 *   2. Work out the duration: the `duration` option, else the server's default. Timeouts
 *      can't be permanent, so if there's no default, a duration must be given.
 *   3. Check the timeout is allowed: see `whyCantTimeout`.
 *   4. Time them out.
 *   5. DM them that they were timed out, why and for how long. They're still in the server,
 *      so this comes after the action, like /mute.
 *   6. Record it with the backend, with its expiry. If only recording fails, the moderator is
 *      told (the timeout still ends on time, since Discord lifts it).
 *
 * Timing out someone who is already timed out updates their timeout: the new one replaces the
 * old in Discord and in the moderation history.
 *
 * All replies are ephemeral: only the moderator sees them.
 */
export default defineCommand({
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription("Time out a member: they can read, but can't talk, react or join voice until it ends.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers) // Hidden from members without Timeout Members
    .setContexts(InteractionContextType.Guild) // Only makes sense in a server, not in DMs
    // Discord requires required options to come before optional ones
    .addUserOption((option) => option.setName('member').setDescription('The member to time out.').setRequired(true))
    // Optional here because the server may have a default (checked below)
    .addStringOption((option) =>
      option
        .setName('duration')
        .setDescription('How long, e.g. "10 minutes", "1d" or "1 week" (max 28 days). Defaults to the server setting.')
        .setMaxLength(64)
        .setAutocomplete(true)
        .setRequired(false),
    )
    // Optional here because whether a reason is required is a per-server setting, checked below
    .addStringOption((option) =>
      option
        .setName('reason')
        .setDescription('Why the member is being timed out.')
        .setMaxLength(MAX_REASON_LENGTH)
        .setRequired(false),
    )
    .addAttachmentOption((option) =>
      option
        .setName('evidence')
        .setDescription('Evidence for the timeout, such as a screenshot or log.')
        .setRequired(false),
    ),

  async execute(interaction) {
    // inCachedGuild() gives full GuildMember objects (roles, moderatable) for the members involved
    if (!interaction.inCachedGuild()) {
      await interaction.reply({ content: 'This command can only be used in a server.', flags: MessageFlags.Ephemeral });
      return;
    }

    // Loading settings and timing out can take longer than the 3s Discord allows for a first reply
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const { guild, member: moderator } = interaction;
    const target = interaction.options.getMember('member');
    const reason = interaction.options.getString('reason')?.trim() || undefined;
    const durationInput = interaction.options.getString('duration')?.trim() || undefined;
    const evidence = interaction.options.getAttachment('evidence') ?? undefined;

    // 1. Server settings
    let settings: TimeoutSettings;
    try {
      settings = await getModerationActionSettings<TimeoutSettings>(guild.id, 'timeouts');
    } catch (error) {
      // Without the settings we can't tell whether the timeout is allowed, so don't do it
      Logger.error(`Couldn't load timeout settings for guild ${guild.id}:`, error);
      await interaction.editReply("Couldn't load this server's timeout settings. Please try again in a moment.");
      return;
    }

    if (!settings.enabled) {
      await interaction.editReply(
        'Timeouts with Loki are turned off in this server. An admin can turn them on in the dashboard under Moderation → Timeouts.',
      );
      return;
    }
    if (settings.reasonRequired && !reason) {
      await interaction.editReply(
        'This server requires a reason for every timeout. Run the command again with `reason`.',
      );
      return;
    }
    if (settings.evidenceRequired && !evidence) {
      await interaction.editReply(
        'This server requires evidence for every timeout. Run the command again with `evidence`.',
      );
      return;
    }

    // 2. Duration: the moderator's, else the server default (0 = no default)
    let durationSeconds = settings.defaultTimeoutDurationSeconds;
    if (durationInput) {
      const parsed = parseDuration(durationInput, TIMEOUT_DURATION_RULES);
      if (!parsed.ok) {
        await interaction.editReply(parsed.error);
        return;
      }
      durationSeconds = parsed.seconds;
    }
    if (durationSeconds <= 0) {
      await interaction.editReply(
        durationInput
          ? "A timeout can't be 0 or permanent. Give it a length, like `10m`, `1d` or `1 week`."
          : 'This server has no default timeout length, so give one with `duration`, like `10m` or `1d`.',
      );
      return;
    }
    // Older settings could hold more than Discord allows; never ask Discord for more than 28 days
    durationSeconds = Math.min(durationSeconds, MAX_TIMEOUT_SECONDS);
    const expiresAt = new Date(Date.now() + durationSeconds * 1000);
    const durationText = `${formatDuration(durationSeconds)}, until ${discordTimestamp(expiresAt)} (${discordTimestamp(expiresAt, 'R')})`;

    // 3. Is this timeout allowed? (getMember is null for users who aren't in the server)
    if (!target) {
      await interaction.editReply("That user isn't a member of this server, so they can't be timed out.");
      return;
    }
    const problem = whyCantTimeout(guild, moderator, target, interaction.memberPermissions);
    if (problem) {
      await interaction.editReply(problem);
      return;
    }

    // A member already in a timeout gets it replaced (new length); the reply says "updated"
    const alreadyTimedOut = target.isCommunicationDisabled();

    // 4. Time out. The audit log shows Loki as the one who did it, so name the moderator in the reason.
    const auditLogReason =
      `${reason ?? 'No reason provided'} (timed out by ${moderator.user.username}, ${formatDuration(durationSeconds)})`.slice(
        0,
        MAX_REASON_LENGTH,
      );
    try {
      await target.timeout(durationSeconds * 1000, auditLogReason);
    } catch (error) {
      Logger.error(`Failed to time out ${target.id} in guild ${guild.id}:`, error);
      await interaction.editReply("Something went wrong and the member wasn't timed out. Please try again.");
      return;
    }

    // 5. Tell them. They're still in the server, so this works unless their DMs are closed.
    const notice = await sendModerationNotice(target, 'timeout', reason, { duration: durationText });

    // 6. Record it. Mentions are shown as names but never ping anyone (allowedMentions).
    const timedOutMessage = [
      `${alreadyTimedOut ? 'Updated the timeout on' : 'Timed out'} ${target}${reason ? ` for: ${reason}` : '.'}`,
      `**Duration:** ${durationText}`,
      notice ? 'They were notified by DM.' : "⚠️ They couldn't be notified: their DMs are probably closed.",
    ].join('\n');

    try {
      await createModerationEvent(guild.id, target.id, {
        issuedBy: moderator.id,
        eventType: 'timeout',
        reason,
        evidenceUrl: evidence?.url,
        expiresAt: expiresAt.toISOString(),
      });
    } catch (error) {
      Logger.error(`Timed out ${target.id} in guild ${guild.id}, but recording the timeout failed:`, error);
      await interaction.editReply({
        content: `${timedOutMessage}\n⚠️ The timeout couldn't be saved to their moderation history. It still ends on time.`,
        allowedMentions: { parse: [] },
      });
      return;
    }

    Logger.info(`${moderator.id} timed out ${target.id} in guild ${guild.id} until ${expiresAt.toISOString()}.`);
    await interaction.editReply({ content: timedOutMessage, allowedMentions: { parse: [] } });
  },

  // Suggestions while typing `duration`: a preview of how it's understood, then presets.
  // Moderators can still submit anything they type; execute() validates it again.
  async autocomplete(interaction) {
    const focused = interaction.options.getFocused(true);
    await interaction.respond(
      durationChoices(focused.value, TIMEOUT_DURATION_RULES, TIMEOUT_DURATION_PRESETS, 'not a valid timeout length'),
    );
  },
});

/**
 * Checks whether `moderator` may time out `target`, and whether the bot can.
 * @returns Why the timeout isn't allowed, to show the moderator, or null if it is
 */
function whyCantTimeout(
  guild: Guild,
  moderator: GuildMember,
  target: GuildMember,
  moderatorPermissions: Readonly<PermissionsBitField>,
): string | null {
  // The command is hidden from members without Timeout Members by default, but server admins
  // can grant it to anyone in Server Settings → Integrations, so check the real permission
  if (!moderatorPermissions.has(PermissionFlagsBits.ModerateMembers)) {
    return 'You need the Timeout Members permission to time out members.';
  }
  if (target.id === moderator.id) {
    return "You can't time yourself out.";
  }
  if (target.id === guild.members.me?.id) {
    return "I can't time myself out.";
  }
  if (target.id === guild.ownerId) {
    return "The server owner can't be timed out.";
  }
  // Same rule Discord applies to people: you can only act on members ranked below you.
  // The owner outranks everyone regardless of roles.
  if (moderator.id !== guild.ownerId && target.roles.highest.comparePositionTo(moderator.roles.highest) >= 0) {
    return `You can only time out members whose highest role is below yours, and ${target}'s isn't.`;
  }
  // Discord itself refuses to time out administrators
  if (target.permissions.has(PermissionFlagsBits.Administrator)) {
    return `${target} has the Administrator permission, and Discord doesn't allow timing out administrators.`;
  }
  // `moderatable` covers the bot's side: the Timeout Members permission and a role above theirs
  if (!target.moderatable) {
    return `I can't time out ${target}. Make sure I have the Timeout Members permission and that my highest role is above theirs.`;
  }
  return null;
}
