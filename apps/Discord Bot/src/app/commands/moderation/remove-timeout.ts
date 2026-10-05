import { defineCommand } from '../../../framework/types.js';
import { InteractionContextType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Logger } from '../../../framework/logger.js';
import { endActiveModerationEvent, getModerationActionSettings } from '../../lib/backend.js';
import { sendModerationNotice } from '../../lib/moderationNotices.js';

// The backend stores reasons up to 512 characters, and Discord's audit log has the same limit
const MAX_REASON_LENGTH = 512;

/**
 * /remove-timeout: lifts a member's timeout before it runs out and closes it in their
 * moderation history.
 *
 * It follows the timeout rules, since removing one is part of timing out:
 * - Timeout Members permission, like /timeout (hidden from members without it, and checked again).
 * - The server's timeout settings (Moderation → Timeouts in the dashboard): it's off when
 *   timeouts are off, and a reason is required when timeouts require one.
 *
 * Steps, in order:
 *   1. Load the timeout settings and enforce them.
 *   2. If the user is in the server and timed out, lift the timeout, and DM them that it was
 *      removed and why (see lib/moderationNotices.ts). Closed DMs don't stop the removal.
 *      (A timeout that runs out on its own gets no DM; only this early removal does.)
 *   3. End their active timeout in the moderation history, so the expiry processor leaves it
 *      alone. This also works for someone who left the server: only the record is closed then.
 *   If they had neither a timeout nor an active record, the moderator is told they aren't
 *   timed out.
 *
 * All replies are ephemeral: only the moderator sees them.
 */
export default defineCommand({
  data: new SlashCommandBuilder()
    .setName('remove-timeout')
    .setDescription("Lift a member's timeout early, so they can talk again.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers) // Same as /timeout: hidden without Timeout Members
    .setContexts(InteractionContextType.Guild) // Only makes sense in a server, not in DMs
    // A user option (not only members), so the record of someone who left can be closed too
    .addUserOption((option) => option.setName('member').setDescription('The timed out member.').setRequired(true))
    // Optional here because it's only required when the server requires reasons for timeouts
    .addStringOption((option) =>
      option
        .setName('reason')
        .setDescription('Why the timeout is being removed.')
        .setMaxLength(MAX_REASON_LENGTH)
        .setRequired(false),
    ),

  async execute(interaction) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({ content: 'This command can only be used in a server.', flags: MessageFlags.Ephemeral });
      return;
    }

    // Loading settings and lifting the timeout can take longer than the 3s Discord allows for a first reply
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const { guild, member: moderator } = interaction;
    const user = interaction.options.getUser('member', true);
    // null when the user isn't in the server
    const member = interaction.options.getMember('member');
    const reason = interaction.options.getString('reason')?.trim() || undefined;

    // The command is hidden from members without Timeout Members by default, but server admins
    // can grant it to anyone in Server Settings → Integrations, so check the real permission
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) {
      await interaction.editReply('You need the Timeout Members permission to remove timeouts.');
      return;
    }

    // 1. Timeout settings
    let settings;
    try {
      settings = await getModerationActionSettings(guild.id, 'timeouts');
    } catch (error) {
      // Without the settings we can't tell whether a reason is required, so don't guess
      Logger.error(`Couldn't load timeout settings for guild ${guild.id}:`, error);
      await interaction.editReply("Couldn't load this server's timeout settings. Please try again in a moment.");
      return;
    }

    if (!settings.enabled) {
      await interaction.editReply(
        'Timeouts with Loki are turned off in this server, and removing them with it. An admin can turn them on in the dashboard under Moderation → Timeouts.',
      );
      return;
    }
    if (settings.reasonRequired && !reason) {
      await interaction.editReply(
        'This server requires a reason for timeouts, and for removing them. Run the command again with `reason`.',
      );
      return;
    }

    // 2. Lift the timeout, if they're here and timed out
    const isTimedOut = Boolean(member?.isCommunicationDisabled());
    // Whether they got the "your timeout was removed" DM (only sent when a timeout was lifted)
    let notified = false;

    if (member && isTimedOut) {
      // `moderatable` covers the bot's side: the Timeout Members permission and a role above theirs
      if (!member.moderatable) {
        await interaction.editReply({
          content: `I can't remove ${member}'s timeout. Make sure I have the Timeout Members permission and that my highest role is above theirs.`,
          allowedMentions: { parse: [] },
        });
        return;
      }

      // The audit log shows Loki as the one who did it, so name the moderator in the reason
      const auditLogReason = `${reason ?? 'No reason provided'} (timeout removed by ${moderator.user.username})`.slice(
        0,
        MAX_REASON_LENGTH,
      );
      try {
        // null clears the timeout
        await member.timeout(null, auditLogReason);
      } catch (error) {
        Logger.error(`Failed to remove the timeout of ${user.id} in guild ${guild.id}:`, error);
        await interaction.editReply("Something went wrong and the timeout wasn't removed. Please try again.");
        return;
      }

      // Let them know they can talk again. Never throws: closed DMs don't stop the removal.
      notified = (await sendModerationNotice(member, 'timeoutRemoved', reason)) !== null;
    }

    // 3. Close the timeout in their moderation history. Mentions never ping anyone (allowedMentions).
    let endedEventId: number | null;
    try {
      endedEventId = await endActiveModerationEvent(guild.id, user.id, {
        eventType: 'timeout',
        endedBy: moderator.id,
        reason,
      });
    } catch (error) {
      Logger.error(`Couldn't close the timeout record of ${user.id} in guild ${guild.id}:`, error);
      await interaction.editReply({
        content: isTimedOut
          ? `Removed ${user}'s timeout.\n⚠️ Their moderation history couldn't be updated, so it may still show the timeout as active.`
          : "Couldn't update their moderation history. Please try again in a moment.",
        allowedMentions: { parse: [] },
      });
      return;
    }

    if (!isTimedOut && endedEventId === null) {
      await interaction.editReply({ content: `${user} isn't timed out.`, allowedMentions: { parse: [] } });
      return;
    }

    Logger.info(`${moderator.id} removed the timeout of ${user.id} in guild ${guild.id}.`);
    const note = !isTimedOut
      ? // Only the record was active: they left, or the timeout was removed from Discord's own menu
        "\nThey weren't timed out in Discord anymore, so only their moderation history was updated."
      : notified
        ? '\nThey were notified by DM.'
        : "\n⚠️ They couldn't be notified: their DMs are probably closed.";
    await interaction.editReply({
      content: `Removed ${user}'s timeout${reason ? ` for: ${reason}` : '.'}${note}`,
      allowedMentions: { parse: [] },
    });
  },
});
