import { defineCommand } from '../../../framework/types.js';
import {
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type Guild,
  type GuildMember,
  type PermissionsBitField,
  type Role,
} from 'discord.js';
import { Logger } from '../../../framework/logger.js';
import { createModerationEvent, getModerationActionSettings, type MuteSettings } from '../../lib/backend.js';
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

/** The `duration` option: how long the mute lasts. 0 ("permanent") lasts until someone unmutes. */
const MUTE_DURATION_RULES: DurationRules = {
  zeroWords: ['permanent', 'perm', 'forever', 'never', 'indefinite'],
  maxSeconds: 10 * SECONDS_PER.year,
  tooLongMessage: 'That mute is longer than 10 years. Use `permanent` instead.',
};
const MUTE_DURATION_PRESETS: DurationChoice[] = [
  { name: '10 minutes', value: '10m' },
  { name: '1 hour', value: '1h' },
  { name: '6 hours', value: '6h' },
  { name: '1 day', value: '1d' },
  { name: '1 week', value: '1w' },
  { name: 'Permanent', value: 'permanent' },
];

/**
 * /mute: stops a member from talking by giving them the server's mute role, and records it in
 * their moderation history. A temporary mute is lifted automatically when it expires (the
 * expiry processor removes the role, see lib/expiryProcessor.ts).
 *
 * The mute role is set by admins in the dashboard (Moderation → Mutes); what it actually
 * blocks depends on its channel permissions, which the server sets up in Discord.
 *
 * Steps, in order:
 *   1. Load the mute settings and enforce them: mutes enabled, reason/evidence required, and
 *      a mute role chosen. They also give the default duration.
 *   2. Work out the duration: the `duration` option, else the server's default.
 *   3. Check the mute is allowed: see `whyCantMute`.
 *   4. Give the member the mute role.
 *   5. DM them that they were muted, why and for how long. Unlike a kick or ban this comes
 *      after the action: they're still in the server, so the bot can reach them either way.
 *   6. Record the mute with the backend, with its expiry. If only recording fails, the
 *      moderator is told, and warned that a temporary mute then won't be lifted automatically.
 *
 * Muting someone who is already muted updates their mute: the new one replaces the old in
 * the moderation history, which is how a wrong duration gets corrected.
 *
 * All replies are ephemeral: only the moderator sees them.
 */
export default defineCommand({
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription("Mute a member: they can still read, but can't talk until the mute ends.")
    // Timeout Members is Discord's own permission for silencing members, so mutes use it too
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setContexts(InteractionContextType.Guild) // Only makes sense in a server, not in DMs
    // Discord requires required options to come before optional ones
    .addUserOption((option) => option.setName('member').setDescription('The member to mute.').setRequired(true))
    // Optional here because whether a reason is required is a per-server setting, checked below
    .addStringOption((option) =>
      option
        .setName('reason')
        .setDescription('Why the member is being muted.')
        .setMaxLength(MAX_REASON_LENGTH)
        .setRequired(false),
    )
    // Free text (see lib/duration.ts), with autocomplete that previews how it's understood
    .addStringOption((option) =>
      option
        .setName('duration')
        .setDescription('How long, e.g. "30 minutes", "1d" or "permanent". Defaults to the server setting.')
        .setMaxLength(64)
        .setAutocomplete(true)
        .setRequired(false),
    )
    .addAttachmentOption((option) =>
      option
        .setName('evidence')
        .setDescription('Evidence for the mute, such as a screenshot or log.')
        .setRequired(false),
    ),

  async execute(interaction) {
    // inCachedGuild() gives full GuildMember objects (roles, permissions) for the members involved
    if (!interaction.inCachedGuild()) {
      await interaction.reply({ content: 'This command can only be used in a server.', flags: MessageFlags.Ephemeral });
      return;
    }

    // Loading settings and muting can take longer than the 3s Discord allows for a first reply
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const { guild, member: moderator } = interaction;
    const target = interaction.options.getMember('member');
    const reason = interaction.options.getString('reason')?.trim() || undefined;
    const durationInput = interaction.options.getString('duration')?.trim() || undefined;
    const evidence = interaction.options.getAttachment('evidence') ?? undefined;

    // 1. Server settings
    let settings: MuteSettings;
    try {
      settings = await getModerationActionSettings<MuteSettings>(guild.id, 'mutes');
    } catch (error) {
      // Without the settings we can't tell whether the mute is allowed, so don't do it
      Logger.error(`Couldn't load mute settings for guild ${guild.id}:`, error);
      await interaction.editReply("Couldn't load this server's mute settings. Please try again in a moment.");
      return;
    }

    if (!settings.enabled) {
      await interaction.editReply(
        'Muting with Loki is turned off in this server. An admin can turn it on in the dashboard under Moderation → Mutes.',
      );
      return;
    }
    if (settings.reasonRequired && !reason) {
      await interaction.editReply('This server requires a reason for every mute. Run the command again with `reason`.');
      return;
    }
    if (settings.evidenceRequired && !evidence) {
      await interaction.editReply(
        'This server requires evidence for every mute. Run the command again with `evidence`.',
      );
      return;
    }

    const muteRole = settings.muteRoleId ? guild.roles.cache.get(settings.muteRoleId) : undefined;
    if (!muteRole) {
      await interaction.editReply(
        settings.muteRoleId
          ? "This server's mute role no longer exists. An admin needs to choose a new one in the dashboard under Moderation → Mutes."
          : "This server hasn't chosen a mute role yet. An admin can set one in the dashboard under Moderation → Mutes.",
      );
      return;
    }

    // 2. Duration: the moderator's, else the server default. 0 = permanent.
    let durationSeconds = settings.defaultMuteDurationSeconds;
    if (durationInput) {
      const parsed = parseDuration(durationInput, MUTE_DURATION_RULES);
      if (!parsed.ok) {
        await interaction.editReply(parsed.error);
        return;
      }
      durationSeconds = parsed.seconds;
    }
    const expiresAt = durationSeconds > 0 ? new Date(Date.now() + durationSeconds * 1000) : null;
    const durationText = expiresAt
      ? `${formatDuration(durationSeconds)}, until ${discordTimestamp(expiresAt)} (${discordTimestamp(expiresAt, 'R')})`
      : 'Permanent';

    // 3. Is this mute allowed? (getMember is null for users who aren't in the server)
    if (!target) {
      await interaction.editReply("That user isn't a member of this server, so they can't be muted.");
      return;
    }
    const problem = whyCantMute(guild, moderator, target, muteRole, interaction.memberPermissions);
    if (problem) {
      await interaction.editReply(problem);
      return;
    }

    // Muting an already muted member updates their mute (new duration); the reply says "updated"
    const alreadyMuted = target.roles.cache.has(muteRole.id);

    // 4. Mute. The audit log shows Loki as the one who did it, so name the moderator in the reason.
    if (!alreadyMuted) {
      const auditLogReason =
        `${reason ?? 'No reason provided'} (muted by ${moderator.user.username}, ${expiresAt ? formatDuration(durationSeconds) : 'permanent'})`.slice(
          0,
          MAX_REASON_LENGTH,
        );
      try {
        await target.roles.add(muteRole, auditLogReason);
      } catch (error) {
        Logger.error(`Failed to mute ${target.id} in guild ${guild.id}:`, error);
        await interaction.editReply("Something went wrong and the member wasn't muted. Please try again.");
        return;
      }
    }

    // 5. Tell them. They're still in the server, so this works unless their DMs are closed.
    const notice = await sendModerationNotice(target, 'mute', reason, { duration: durationText });

    // 6. Record it. Mentions are shown as names but never ping anyone (allowedMentions).
    const mutedMessage = [
      `${alreadyMuted ? 'Updated the mute on' : 'Muted'} ${target}${reason ? ` for: ${reason}` : '.'}`,
      `**Duration:** ${durationText}`,
      notice ? 'They were notified by DM.' : "⚠️ They couldn't be notified: their DMs are probably closed.",
    ].join('\n');

    try {
      await createModerationEvent(guild.id, target.id, {
        issuedBy: moderator.id,
        eventType: 'mute',
        reason,
        evidenceUrl: evidence?.url,
        expiresAt: expiresAt?.toISOString(),
      });
    } catch (error) {
      Logger.error(`Muted ${target.id} in guild ${guild.id}, but recording the mute failed:`, error);
      await interaction.editReply({
        content:
          `${mutedMessage}\n⚠️ The mute couldn't be saved to their moderation history.` +
          (expiresAt ? " It also won't be lifted automatically: remove the mute role by hand when it should end." : ''),
        allowedMentions: { parse: [] },
      });
      return;
    }

    Logger.info(
      `${moderator.id} muted ${target.id} in guild ${guild.id} (${expiresAt ? `until ${expiresAt.toISOString()}` : 'permanent'}).`,
    );
    await interaction.editReply({ content: mutedMessage, allowedMentions: { parse: [] } });
  },

  // Suggestions while typing `duration`: a preview of how it's understood, then presets.
  // Moderators can still submit anything they type; execute() validates it again.
  async autocomplete(interaction) {
    const focused = interaction.options.getFocused(true);
    await interaction.respond(durationChoices(focused.value, MUTE_DURATION_RULES, MUTE_DURATION_PRESETS, 'permanent'));
  },
});

/**
 * Checks whether `moderator` may mute `target` with `muteRole`, and whether the bot can.
 * @returns Why the mute isn't allowed, to show the moderator, or null if it is
 */
function whyCantMute(
  guild: Guild,
  moderator: GuildMember,
  target: GuildMember,
  muteRole: Role,
  moderatorPermissions: Readonly<PermissionsBitField>,
): string | null {
  // The command is hidden from members without Timeout Members by default, but server admins
  // can grant it to anyone in Server Settings → Integrations, so check the real permission
  if (!moderatorPermissions.has(PermissionFlagsBits.ModerateMembers)) {
    return 'You need the Timeout Members permission to mute members.';
  }
  if (target.id === moderator.id) {
    return "You can't mute yourself.";
  }
  if (target.id === guild.members.me?.id) {
    return "I can't mute myself.";
  }
  if (target.id === guild.ownerId) {
    return "The server owner can't be muted.";
  }
  // Same rule Discord applies to people: you can only act on members ranked below you.
  // The owner outranks everyone regardless of roles.
  if (moderator.id !== guild.ownerId && target.roles.highest.comparePositionTo(moderator.roles.highest) >= 0) {
    return `You can only mute members whose highest role is below yours, and ${target}'s isn't.`;
  }
  // Administrator overrides every channel permission, so a mute role can't restrict them
  if (target.permissions.has(PermissionFlagsBits.Administrator)) {
    return `${target} has the Administrator permission, which overrides the mute role, so muting them wouldn't do anything.`;
  }
  // Giving a role needs Manage Roles, and the role must be below the bot's highest role
  // (`editable` checks both)
  if (!muteRole.editable) {
    return `I can't give out ${muteRole}. Make sure I have the Manage Roles permission and that my highest role is above it.`;
  }
  return null;
}
