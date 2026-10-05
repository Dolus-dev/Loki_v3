import { defineCommand } from '../../../framework/types.js';
import {
  DiscordAPIError,
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  RESTJSONErrorCodes,
  SlashCommandBuilder,
  type Guild,
  type GuildMember,
  type PermissionsBitField,
  type User,
} from 'discord.js';
import { Logger } from '../../../framework/logger.js';
import {
  createModerationEvent,
  getModerationActionSettings,
  type ModerationActionSettings,
} from '../../lib/backend.js';
import { discordTimestamp, formatDuration, parseDuration } from '../../lib/duration.js';
import { sendModerationNotice } from '../../lib/moderationNotices.js';

// The backend stores reasons up to 512 characters, and Discord's audit log has the same limit
const MAX_REASON_LENGTH = 512;

/** The ban settings from the dashboard (Moderation → Bans). */
interface BanSettings extends ModerationActionSettings {
  /** Used when /ban is run without a duration. 0 = permanent. */
  defaultBanDurationSeconds: number;
}

/**
 * /ban: bans a user (whether or not they're in the server) and records it in their moderation
 * history. A temporary ban is lifted automatically when it expires (lib/expiryProcessor.ts).
 *
 * Steps, in order:
 *   1. Load the server's ban settings (Moderation → Bans in the dashboard) and enforce them:
 *      bans enabled, reason/evidence required. They also give the default duration.
 *   2. Work out the duration: the `duration` option, else the server's default.
 *   3. Check the ban is allowed: see `whyCantBan`. Role checks only apply to members.
 *   4. DM the user that they're being banned, why, and for how long. Only possible for
 *      members, and only before the ban: afterwards the bot usually can't DM them.
 *   5. Ban them, optionally deleting their recent messages. If the ban fails, the DM is
 *      deleted again.
 *   6. Record the ban with the backend, with its expiry. After the ban, so a failed ban never
 *      leaves a record. If only recording fails, the moderator is told, and warned that a
 *      temporary ban then won't be lifted automatically.
 *
 * Banning someone who is already banned updates their ban: the new ban replaces the old one
 * in the moderation history, which is how a wrong duration gets corrected.
 *
 * All replies are ephemeral: only the moderator sees them.
 */
export default defineCommand({
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user from the server, permanently or for a set time.')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers) // Hidden from members without the Ban Members permission
    .setContexts(InteractionContextType.Guild) // Banning only makes sense in a server, not in DMs
    // Discord requires required options to come before optional ones.
    // A user option (not member) so people who already left can be banned too.
    .addUserOption((option) => option.setName('user').setDescription('The user to ban.').setRequired(true))
    // Optional here because whether a reason is required is a per-server setting, checked below
    .addStringOption((option) =>
      option
        .setName('reason')
        .setDescription('Why the user is being banned.')
        .setMaxLength(MAX_REASON_LENGTH)
        .setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName('duration')
        .setDescription('How long, e.g. 12h, 7d, 1w or "permanent". Defaults to the server\'s default ban duration.')
        .setMaxLength(32)
        .setRequired(false),
    )
    .addIntegerOption((option) =>
      option
        .setName('delete_messages')
        .setDescription("Delete the user's messages from this far back. Defaults to none.")
        .setRequired(false)
        // Discord can delete at most 7 days of messages
        .addChoices(
          { name: "Don't delete any", value: 0 },
          { name: 'Last hour', value: 60 * 60 },
          { name: 'Last 6 hours', value: 6 * 60 * 60 },
          { name: 'Last 12 hours', value: 12 * 60 * 60 },
          { name: 'Last 24 hours', value: 24 * 60 * 60 },
          { name: 'Last 3 days', value: 3 * 24 * 60 * 60 },
          { name: 'Last 7 days', value: 7 * 24 * 60 * 60 },
        ),
    )
    .addAttachmentOption((option) =>
      option
        .setName('evidence')
        .setDescription('Evidence for the ban, such as a screenshot or log.')
        .setRequired(false),
    ),

  async execute(interaction) {
    // inCachedGuild() gives full GuildMember objects (roles, bannable) for the members involved
    if (!interaction.inCachedGuild()) {
      await interaction.reply({ content: 'This command can only be used in a server.', flags: MessageFlags.Ephemeral });
      return;
    }

    // Loading settings and banning can take longer than the 3s Discord allows for a first reply
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const { guild, member: moderator } = interaction;
    const user = interaction.options.getUser('user', true);
    // null when the user isn't in the server
    const member = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason')?.trim() || undefined;
    const durationInput = interaction.options.getString('duration')?.trim() || undefined;
    const deleteMessageSeconds = interaction.options.getInteger('delete_messages') ?? 0;
    const evidence = interaction.options.getAttachment('evidence') ?? undefined;

    // 1. Server settings
    let settings: BanSettings;
    try {
      settings = await getModerationActionSettings<BanSettings>(guild.id, 'bans');
    } catch (error) {
      // Without the settings we can't tell whether the ban is allowed, so don't do it
      Logger.error(`Couldn't load ban settings for guild ${guild.id}:`, error);
      await interaction.editReply("Couldn't load this server's ban settings. Please try again in a moment.");
      return;
    }

    if (!settings.enabled) {
      await interaction.editReply(
        'Banning with Loki is turned off in this server. An admin can turn it on in the dashboard under Moderation → Bans.',
      );
      return;
    }
    if (settings.reasonRequired && !reason) {
      await interaction.editReply('This server requires a reason for every ban. Run the command again with `reason`.');
      return;
    }
    if (settings.evidenceRequired && !evidence) {
      await interaction.editReply(
        'This server requires evidence for every ban. Run the command again with `evidence`.',
      );
      return;
    }

    // 2. Duration: the moderator's, else the server default. 0 = permanent.
    let durationSeconds = settings.defaultBanDurationSeconds;
    if (durationInput) {
      const parsed = parseDuration(durationInput);
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

    // 3. Is this ban allowed?
    const problem = whyCantBan(guild, moderator, user, member, interaction.memberPermissions);
    if (problem) {
      await interaction.editReply(problem);
      return;
    }

    // Banning an already banned user updates their ban; they get no new DM (they can't be
    // reached anyway) and the reply says "updated"
    const alreadyBanned = await isBanned(guild, user.id);

    // 4. Tell them, while the bot can still DM them (members only). Null = couldn't.
    const notice =
      member && !alreadyBanned ? await sendModerationNotice(member, 'ban', reason, { duration: durationText }) : null;

    // 5. Ban. The audit log shows Loki as the one who banned, so name the moderator in the reason.
    const auditLogReason =
      `${reason ?? 'No reason provided'} (banned by ${moderator.user.username}, ${expiresAt ? formatDuration(durationSeconds) : 'permanent'})`.slice(
        0,
        MAX_REASON_LENGTH,
      );
    try {
      await guild.bans.create(user.id, { reason: auditLogReason, deleteMessageSeconds });
    } catch (error) {
      Logger.error(`Failed to ban ${user.id} from guild ${guild.id}:`, error);
      // Take back the "you were banned" DM, since they weren't
      await notice?.delete().catch((deleteError) => {
        Logger.warn(`Couldn't delete the ban notice sent to ${user.id}:`, deleteError);
      });
      await interaction.editReply("Something went wrong and the user wasn't banned. Please try again.");
      return;
    }

    // 6. Record it. Mentions are shown as names but never ping anyone (allowedMentions).
    const notifiedLine = !member
      ? "They weren't in the server, so they weren't notified."
      : alreadyBanned
        ? ''
        : notice
          ? 'They were notified by DM.'
          : "⚠️ They couldn't be notified: their DMs are probably closed.";
    const bannedMessage = [
      `${alreadyBanned ? 'Updated the ban on' : 'Banned'} ${user}${reason ? ` for: ${reason}` : '.'}`,
      `**Duration:** ${durationText}`,
      notifiedLine,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await createModerationEvent(guild.id, user.id, {
        issuedBy: moderator.id,
        eventType: 'ban',
        reason,
        evidenceUrl: evidence?.url,
        expiresAt: expiresAt?.toISOString(),
      });
    } catch (error) {
      Logger.error(`Banned ${user.id} from guild ${guild.id}, but recording the ban failed:`, error);
      await interaction.editReply({
        content:
          `${bannedMessage}\n⚠️ The ban couldn't be saved to their moderation history.` +
          (expiresAt ? " It also won't be lifted automatically: unban them by hand when it should end." : ''),
        allowedMentions: { parse: [] },
      });
      return;
    }

    Logger.info(
      `${moderator.id} banned ${user.id} from guild ${guild.id} (${expiresAt ? `until ${expiresAt.toISOString()}` : 'permanent'}).`,
    );
    await interaction.editReply({ content: bannedMessage, allowedMentions: { parse: [] } });
  },
});

/**
 * Checks whether `moderator` may ban `user`, and whether the bot can carry it out.
 * Role checks only apply when the user is a member (`member` isn't null).
 * @returns Why the ban isn't allowed, to show the moderator, or null if it is
 */
function whyCantBan(
  guild: Guild,
  moderator: GuildMember,
  user: User,
  member: GuildMember | null,
  moderatorPermissions: Readonly<PermissionsBitField>,
): string | null {
  // The command is hidden from members without Ban Members by default, but server admins
  // can grant it to anyone in Server Settings → Integrations, so check the real permission
  if (!moderatorPermissions.has(PermissionFlagsBits.BanMembers)) {
    return 'You need the Ban Members permission to ban users.';
  }
  if (user.id === moderator.id) {
    return "You can't ban yourself.";
  }
  if (user.id === guild.members.me?.id) {
    return "I can't ban myself. To remove Loki, use Server Settings → Integrations.";
  }
  if (user.id === guild.ownerId) {
    return "The server owner can't be banned.";
  }

  if (member) {
    // Same rule Discord applies to people: you can only act on members ranked below you.
    // The owner outranks everyone regardless of roles.
    if (moderator.id !== guild.ownerId && member.roles.highest.comparePositionTo(moderator.roles.highest) >= 0) {
      return `You can only ban members whose highest role is below yours, and ${member}'s isn't.`;
    }
    // `bannable` covers the bot's side: the Ban Members permission and a role above the member's
    if (!member.bannable) {
      return `I can't ban ${member}. Make sure I have the Ban Members permission and that my highest role is above theirs.`;
    }
  } else if (!guild.members.me?.permissions.has(PermissionFlagsBits.BanMembers)) {
    // Non-members have no roles to compare; the bot only needs the permission
    return "I can't ban users here. Make sure I have the Ban Members permission.";
  }

  return null;
}

/** Whether the user is currently banned from the guild. */
async function isBanned(guild: Guild, userId: string): Promise<boolean> {
  try {
    await guild.bans.fetch({ user: userId, force: true });
    return true;
  } catch (error) {
    if (error instanceof DiscordAPIError && error.code === RESTJSONErrorCodes.UnknownBan) {
      return false;
    }
    // Can't tell (e.g. a Discord hiccup): treat as not banned, which only affects the wording
    Logger.warn(`Couldn't check whether ${userId} is banned in guild ${guild.id}:`, error);
    return false;
  }
}
