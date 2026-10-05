import { defineCommand } from '../../../framework/types.js';
import {
  DiscordAPIError,
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  RESTJSONErrorCodes,
  SlashCommandBuilder,
} from 'discord.js';
import { Logger } from '../../../framework/logger.js';
import { endActiveModerationEvent, getModerationActionSettings } from '../../lib/backend.js';

// The backend stores reasons up to 512 characters, and Discord's audit log has the same limit
const MAX_REASON_LENGTH = 512;

/**
 * /unban: lifts a user's ban and closes it in their moderation history.
 *
 * It follows the ban rules, since an unban is part of banning:
 * - Ban Members permission, like /ban (hidden from members without it, and checked again).
 * - The server's ban settings (Moderation → Bans in the dashboard): unbanning is off when
 *   bans are off, and a reason is required when bans require one.
 *
 * Steps, in order:
 *   1. Load the ban settings and enforce them.
 *   2. Check the bot has the Ban Members permission.
 *   3. Unban. The reason and moderator are put in Discord's audit log. If the user isn't
 *      banned, Discord says so ("Unknown Ban") and the moderator is told.
 *   4. End their active ban in the moderation history (it stops counting as active, so the
 *      expiry processor won't try to lift it again). A ban made outside Loki has no record
 *      to end, which is fine.
 *
 * All replies are ephemeral: only the moderator sees them.
 */
export default defineCommand({
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Lift a ban, so the user can join the server again.')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers) // Same as /ban: hidden without Ban Members
    .setContexts(InteractionContextType.Guild) // Only makes sense in a server, not in DMs
    // Banned users aren't members, but a user option still takes their ID or @mention
    .addUserOption((option) =>
      option.setName('user').setDescription('The banned user (their user ID works too).').setRequired(true),
    )
    // Optional here because it's only required when the server requires reasons for bans
    .addStringOption((option) =>
      option
        .setName('reason')
        .setDescription('Why the ban is being lifted.')
        .setMaxLength(MAX_REASON_LENGTH)
        .setRequired(false),
    ),

  async execute(interaction) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({ content: 'This command can only be used in a server.', flags: MessageFlags.Ephemeral });
      return;
    }

    // Loading settings and unbanning can take longer than the 3s Discord allows for a first reply
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const { guild, member: moderator } = interaction;
    const user = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason')?.trim() || undefined;

    // The command is hidden from members without Ban Members by default, but server admins
    // can grant it to anyone in Server Settings → Integrations, so check the real permission
    if (!interaction.memberPermissions.has(PermissionFlagsBits.BanMembers)) {
      await interaction.editReply('You need the Ban Members permission to unban users.');
      return;
    }

    // 1. Ban settings
    let settings;
    try {
      settings = await getModerationActionSettings(guild.id, 'bans');
    } catch (error) {
      // Without the settings we can't tell whether a reason is required, so don't guess
      Logger.error(`Couldn't load ban settings for guild ${guild.id}:`, error);
      await interaction.editReply("Couldn't load this server's ban settings. Please try again in a moment.");
      return;
    }

    if (!settings.enabled) {
      await interaction.editReply(
        'Banning with Loki is turned off in this server, and unbanning with it. An admin can turn it on in the dashboard under Moderation → Bans.',
      );
      return;
    }
    if (settings.reasonRequired && !reason) {
      await interaction.editReply(
        'This server requires a reason for bans, and for lifting them. Run the command again with `reason`.',
      );
      return;
    }

    // 2. Can the bot unban, and is there a ban to lift?
    if (!guild.members.me?.permissions.has(PermissionFlagsBits.BanMembers)) {
      await interaction.editReply("I can't unban users here. Make sure I have the Ban Members permission.");
      return;
    }

    // 3. Unban. The audit log shows Loki as the one who unbanned, so name the moderator in the reason.
    const auditLogReason = `${reason ?? 'No reason provided'} (unbanned by ${moderator.user.username})`.slice(
      0,
      MAX_REASON_LENGTH,
    );
    try {
      await guild.bans.remove(user.id, auditLogReason);
    } catch (error) {
      // Discord answers "Unknown Ban" when there's no ban to lift; checking first would just
      // add a request, so let the unban itself tell us
      if (error instanceof DiscordAPIError && error.code === RESTJSONErrorCodes.UnknownBan) {
        await interaction.editReply({
          content: `${user} isn't banned from this server.`,
          allowedMentions: { parse: [] },
        });
        return;
      }
      Logger.error(`Failed to unban ${user.id} in guild ${guild.id}:`, error);
      await interaction.editReply("Something went wrong and the user wasn't unbanned. Please try again.");
      return;
    }

    // 4. Close the ban in their moderation history. Mentions never ping anyone (allowedMentions).
    const unbannedMessage = `Unbanned ${user}${reason ? ` for: ${reason}` : '.'}`;
    try {
      const endedEventId = await endActiveModerationEvent(guild.id, user.id, {
        eventType: 'ban',
        endedBy: moderator.id,
        reason,
      });
      if (endedEventId === null) {
        // Banned outside Loki (e.g. from Discord's own menu): there was no record to close
        Logger.debug(`Unbanned ${user.id} in guild ${guild.id}; they had no active ban on record.`);
      }
    } catch (error) {
      Logger.error(`Unbanned ${user.id} in guild ${guild.id}, but closing their ban record failed:`, error);
      await interaction.editReply({
        content: `${unbannedMessage}\n⚠️ Their moderation history couldn't be updated, so it may still show the ban as active.`,
        allowedMentions: { parse: [] },
      });
      return;
    }

    Logger.info(`${moderator.id} unbanned ${user.id} in guild ${guild.id}.`);
    await interaction.editReply({ content: unbannedMessage, allowedMentions: { parse: [] } });
  },
});
