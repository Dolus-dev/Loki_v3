import { defineCommand } from '../../../framework/types.js';
import { InteractionContextType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Logger } from '../../../framework/logger.js';
import { endActiveModerationEvent, getModerationActionSettings, type MuteSettings } from '../../lib/backend.js';

// The backend stores reasons up to 512 characters, and Discord's audit log has the same limit
const MAX_REASON_LENGTH = 512;

/**
 * /unmute: lifts a member's mute (takes the mute role away) and closes it in their moderation
 * history.
 *
 * It follows the mute rules, since an unmute is part of muting:
 * - Timeout Members permission, like /mute (hidden from members without it, and checked again).
 * - The server's mute settings (Moderation → Mutes in the dashboard): unmuting is off when
 *   mutes are off, and a reason is required when mutes require one.
 *
 * Steps, in order:
 *   1. Load the mute settings and enforce them.
 *   2. If the user is in the server and has the mute role, remove it.
 *   3. End their active mute in the moderation history (so the expiry processor leaves it
 *      alone). This also works for someone who left the server: leaving drops their roles,
 *      but an active mute record can still be closed.
 *   If they had neither the role nor an active mute, they weren't muted, and the moderator
 *   is told so.
 *
 * All replies are ephemeral: only the moderator sees them.
 */
export default defineCommand({
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Lift a mute, so the member can talk again.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers) // Same as /mute: hidden without Timeout Members
    .setContexts(InteractionContextType.Guild) // Only makes sense in a server, not in DMs
    // A user option (not only members), so a mute record of someone who left can be closed too
    .addUserOption((option) => option.setName('member').setDescription('The muted member.').setRequired(true))
    // Optional here because it's only required when the server requires reasons for mutes
    .addStringOption((option) =>
      option
        .setName('reason')
        .setDescription('Why the mute is being lifted.')
        .setMaxLength(MAX_REASON_LENGTH)
        .setRequired(false),
    ),

  async execute(interaction) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({ content: 'This command can only be used in a server.', flags: MessageFlags.Ephemeral });
      return;
    }

    // Loading settings and unmuting can take longer than the 3s Discord allows for a first reply
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const { guild, member: moderator } = interaction;
    const user = interaction.options.getUser('member', true);
    // null when the user isn't in the server
    const member = interaction.options.getMember('member');
    const reason = interaction.options.getString('reason')?.trim() || undefined;

    // The command is hidden from members without Timeout Members by default, but server admins
    // can grant it to anyone in Server Settings → Integrations, so check the real permission
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) {
      await interaction.editReply('You need the Timeout Members permission to unmute members.');
      return;
    }

    // 1. Mute settings
    let settings: MuteSettings;
    try {
      settings = await getModerationActionSettings<MuteSettings>(guild.id, 'mutes');
    } catch (error) {
      // Without the settings we don't know the mute role or whether a reason is required
      Logger.error(`Couldn't load mute settings for guild ${guild.id}:`, error);
      await interaction.editReply("Couldn't load this server's mute settings. Please try again in a moment.");
      return;
    }

    if (!settings.enabled) {
      await interaction.editReply(
        'Muting with Loki is turned off in this server, and unmuting with it. An admin can turn it on in the dashboard under Moderation → Mutes.',
      );
      return;
    }
    if (settings.reasonRequired && !reason) {
      await interaction.editReply(
        'This server requires a reason for mutes, and for lifting them. Run the command again with `reason`.',
      );
      return;
    }

    // 2. Take the mute role away, if they're here and have it
    const muteRole = settings.muteRoleId ? guild.roles.cache.get(settings.muteRoleId) : undefined;
    const hasMuteRole = Boolean(member && muteRole && member.roles.cache.has(muteRole.id));

    if (member && muteRole && hasMuteRole) {
      // Removing a role needs Manage Roles and the role below the bot's highest (`editable`)
      if (!muteRole.editable) {
        await interaction.editReply(
          `I can't take away ${muteRole}. Make sure I have the Manage Roles permission and that my highest role is above it.`,
        );
        return;
      }

      // The audit log shows Loki as the one who did it, so name the moderator in the reason
      const auditLogReason = `${reason ?? 'No reason provided'} (unmuted by ${moderator.user.username})`.slice(
        0,
        MAX_REASON_LENGTH,
      );
      try {
        await member.roles.remove(muteRole, auditLogReason);
      } catch (error) {
        Logger.error(`Failed to unmute ${user.id} in guild ${guild.id}:`, error);
        await interaction.editReply("Something went wrong and the member wasn't unmuted. Please try again.");
        return;
      }
    }

    // 3. Close the mute in their moderation history. Mentions never ping anyone (allowedMentions).
    let endedEventId: number | null;
    try {
      endedEventId = await endActiveModerationEvent(guild.id, user.id, {
        eventType: 'mute',
        endedBy: moderator.id,
        reason,
      });
    } catch (error) {
      Logger.error(`Couldn't close the mute record of ${user.id} in guild ${guild.id}:`, error);
      await interaction.editReply({
        content: hasMuteRole
          ? `Unmuted ${user}.\n⚠️ Their moderation history couldn't be updated, so it may still show the mute as active.`
          : "Couldn't update their moderation history. Please try again in a moment.",
        allowedMentions: { parse: [] },
      });
      return;
    }

    if (!hasMuteRole && endedEventId === null) {
      await interaction.editReply({ content: `${user} isn't muted.`, allowedMentions: { parse: [] } });
      return;
    }

    Logger.info(`${moderator.id} unmuted ${user.id} in guild ${guild.id}.`);
    const note = hasMuteRole
      ? ''
      : // Only the record was active: they left (dropping the role) or the role was removed by hand
        "\nThey didn't have the mute role anymore, so only their moderation history was updated.";
    await interaction.editReply({
      content: `Unmuted ${user}${reason ? ` for: ${reason}` : '.'}${note}`,
      allowedMentions: { parse: [] },
    });
  },
});
