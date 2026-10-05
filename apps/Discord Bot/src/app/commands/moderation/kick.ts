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
import { createModerationEvent, getModerationActionSettings } from '../../lib/backend.js';
import { sendModerationNotice } from '../../lib/moderationNotices.js';

// The backend stores reasons up to 512 characters, and Discord's audit log has the same limit
const MAX_REASON_LENGTH = 512;

/**
 * /kick: removes a member from the server and records it in their moderation history.
 *
 * Steps, in order:
 *   1. Load the server's kick settings from the backend (Moderation → Kicks in the dashboard)
 *      and enforce them: kicks enabled, reason/evidence required.
 *   2. Check the kick is allowed: see `whyCantKick`.
 *   3. DM the member that they're being kicked, and why (see lib/moderationNotices.ts). This
 *      has to happen before the kick: afterwards the bot usually can't DM them. Closed DMs
 *      don't stop the kick; the moderator is just told the member wasn't notified.
 *   4. Kick the member. The reason and moderator are put in Discord's audit log. If the kick
 *      fails, the DM from step 3 is deleted again, so nobody is told about a kick that
 *      didn't happen.
 *   5. Record the kick with the backend. This happens after the kick, so a failed kick never
 *      leaves a record behind; if only the recording fails, the moderator is told.
 *
 * All replies are ephemeral: only the moderator sees them.
 */
export default defineCommand({
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the server.')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers) // Hidden from members without the Kick Members permission
    .setContexts(InteractionContextType.Guild) // Kicking only makes sense in a server, not in DMs
    // Discord requires required options to come before optional ones
    .addUserOption((option) => option.setName('member').setDescription('The member to kick.').setRequired(true))
    // Optional here because whether a reason is required is a per-server setting, checked below
    .addStringOption((option) =>
      option
        .setName('reason')
        .setDescription('Why the member is being kicked.')
        .setMaxLength(MAX_REASON_LENGTH)
        .setRequired(false),
    )
    .addAttachmentOption((option) =>
      option
        .setName('evidence')
        .setDescription('Evidence for the kick, such as a screenshot or log.')
        .setRequired(false),
    ),

  async execute(interaction) {
    // inCachedGuild() gives full GuildMember objects (roles, kickable) for the members involved
    if (!interaction.inCachedGuild()) {
      await interaction.reply({ content: 'This command can only be used in a server.', flags: MessageFlags.Ephemeral });
      return;
    }

    // Loading settings and kicking can take longer than the 3s Discord allows for a first reply
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const { guild, member: moderator } = interaction;
    const target = interaction.options.getMember('member');
    const reason = interaction.options.getString('reason')?.trim() || undefined;
    const evidence = interaction.options.getAttachment('evidence') ?? undefined;

    // 1. Server settings
    let settings;
    try {
      settings = await getModerationActionSettings(guild.id, 'kicks');
    } catch (error) {
      // Without the settings we can't tell whether the kick is allowed, so don't do it
      Logger.error(`Couldn't load kick settings for guild ${guild.id}:`, error);
      await interaction.editReply("Couldn't load this server's kick settings. Please try again in a moment.");
      return;
    }

    if (!settings.enabled) {
      await interaction.editReply(
        'Kicking with Loki is turned off in this server. An admin can turn it on in the dashboard under Moderation → Kicks.',
      );
      return;
    }
    if (settings.reasonRequired && !reason) {
      await interaction.editReply('This server requires a reason for every kick. Run the command again with `reason`.');
      return;
    }
    if (settings.evidenceRequired && !evidence) {
      await interaction.editReply(
        'This server requires evidence for every kick. Run the command again with `evidence`.',
      );
      return;
    }

    // 2. Is this kick allowed? (getMember is null for users who aren't in the server)
    if (!target) {
      await interaction.editReply("That user isn't a member of this server.");
      return;
    }
    const problem = whyCantKick(guild, moderator, target, interaction.memberPermissions);
    if (problem) {
      await interaction.editReply(problem);
      return;
    }

    // 3. Tell the member, while the bot can still DM them. Null means their DMs are closed.
    const notice = await sendModerationNotice(target, 'kick', reason);

    // 4. Kick. The audit log shows Loki as the one who kicked, so name the moderator in the reason.
    const auditLogReason = `${reason ?? 'No reason provided'} (kicked by ${moderator.user.username})`.slice(
      0,
      MAX_REASON_LENGTH,
    );
    try {
      await target.kick(auditLogReason);
    } catch (error) {
      Logger.error(`Failed to kick ${target.id} from guild ${guild.id}:`, error);
      // Take back the "you were kicked" DM, since they weren't
      await notice?.delete().catch((deleteError) => {
        Logger.warn(`Couldn't delete the kick notice sent to ${target.id}:`, deleteError);
      });
      await interaction.editReply("Something went wrong and the member wasn't kicked. Please try again.");
      return;
    }

    // 5. Record it. Mentions are shown as names but never ping anyone (allowedMentions).
    const kickedMessage =
      `Kicked ${target}${reason ? ` for: ${reason}` : '.'}\n` +
      (notice ? 'They were notified by DM.' : "⚠️ They couldn't be notified: their DMs are probably closed.");
    try {
      await createModerationEvent(guild.id, target.id, {
        issuedBy: moderator.id,
        eventType: 'kick',
        reason,
        evidenceUrl: evidence?.url,
      });
    } catch (error) {
      Logger.error(`Kicked ${target.id} from guild ${guild.id}, but recording the kick failed:`, error);
      await interaction.editReply({
        content: `${kickedMessage}\n⚠️ The kick couldn't be saved to their moderation history.`,
        allowedMentions: { parse: [] },
      });
      return;
    }

    Logger.info(`${moderator.id} kicked ${target.id} from guild ${guild.id}.`);
    await interaction.editReply({ content: kickedMessage, allowedMentions: { parse: [] } });
  },
});

/**
 * Checks whether `moderator` may kick `target`, and whether the bot can carry it out.
 * @returns Why the kick isn't allowed, to show the moderator, or null if it is
 */
function whyCantKick(
  guild: Guild,
  moderator: GuildMember,
  target: GuildMember,
  moderatorPermissions: Readonly<PermissionsBitField>,
): string | null {
  // The command is hidden from members without Kick Members by default, but server admins
  // can grant it to anyone in Server Settings → Integrations, so check the real permission
  if (!moderatorPermissions.has(PermissionFlagsBits.KickMembers)) {
    return 'You need the Kick Members permission to kick members.';
  }
  if (target.id === moderator.id) {
    return "You can't kick yourself.";
  }
  if (target.id === guild.members.me?.id) {
    return "I can't kick myself. To remove Loki, use Server Settings → Integrations.";
  }
  if (target.id === guild.ownerId) {
    return "The server owner can't be kicked.";
  }
  // Same rule Discord applies to people: you can only act on members ranked below you.
  // The owner outranks everyone regardless of roles.
  if (moderator.id !== guild.ownerId && target.roles.highest.comparePositionTo(moderator.roles.highest) >= 0) {
    return `You can only kick members whose highest role is below yours, and ${target}'s isn't.`;
  }
  // `kickable` covers the bot's side: the Kick Members permission and a role above the target's
  if (!target.kickable) {
    return `I can't kick ${target}. Make sure I have the Kick Members permission and that my highest role is above theirs.`;
  }
  return null;
}
