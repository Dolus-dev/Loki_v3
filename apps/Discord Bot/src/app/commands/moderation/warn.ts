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

// The backend stores reasons up to 512 characters
const MAX_REASON_LENGTH = 512;

/**
 * /warn: gives a member a formal warning. It doesn't change anything in Discord; the warning
 * is the record in their moderation history, plus a DM telling them about it.
 *
 * Steps, in order:
 *   1. Load the server's warn settings (Moderation → Warns in the dashboard) and enforce
 *      them: warns enabled, reason/evidence required.
 *   2. Check the warning is allowed: see `whyCantWarn`.
 *   3. Record the warning with the backend. This comes first because the record *is* the
 *      warning: if it can't be saved, nothing happened, and the member isn't told anything.
 *   4. DM the member that they were warned and why (see lib/moderationNotices.ts).
 *
 * All replies are ephemeral: only the moderator sees them.
 */
export default defineCommand({
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription("Give a member a formal warning. It's added to their record and sent to them by DM.")
    // Timeout Members, like the other moderation commands that don't remove anyone
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setContexts(InteractionContextType.Guild) // Only makes sense in a server, not in DMs
    // Discord requires required options to come before optional ones
    .addUserOption((option) => option.setName('member').setDescription('The member to warn.').setRequired(true))
    // Optional here because whether a reason is required is a per-server setting, checked below
    .addStringOption((option) =>
      option
        .setName('reason')
        .setDescription('Why the member is being warned. They will see it.')
        .setMaxLength(MAX_REASON_LENGTH)
        .setRequired(false),
    )
    .addAttachmentOption((option) =>
      option
        .setName('evidence')
        .setDescription('Evidence for the warning, such as a screenshot or log.')
        .setRequired(false),
    ),

  async execute(interaction) {
    // inCachedGuild() gives full GuildMember objects (roles) for the members involved
    if (!interaction.inCachedGuild()) {
      await interaction.reply({ content: 'This command can only be used in a server.', flags: MessageFlags.Ephemeral });
      return;
    }

    // Loading settings and saving can take longer than the 3s Discord allows for a first reply
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const { guild, member: moderator } = interaction;
    const target = interaction.options.getMember('member');
    const reason = interaction.options.getString('reason')?.trim() || undefined;
    const evidence = interaction.options.getAttachment('evidence') ?? undefined;

    // 1. Server settings
    let settings;
    try {
      settings = await getModerationActionSettings(guild.id, 'warns');
    } catch (error) {
      // Without the settings we can't tell whether the warning is allowed, so don't give it
      Logger.error(`Couldn't load warn settings for guild ${guild.id}:`, error);
      await interaction.editReply("Couldn't load this server's warn settings. Please try again in a moment.");
      return;
    }

    if (!settings.enabled) {
      await interaction.editReply(
        'Warnings with Loki are turned off in this server. An admin can turn them on in the dashboard under Moderation → Warns.',
      );
      return;
    }
    if (settings.reasonRequired && !reason) {
      await interaction.editReply(
        'This server requires a reason for every warning. Run the command again with `reason`.',
      );
      return;
    }
    if (settings.evidenceRequired && !evidence) {
      await interaction.editReply(
        'This server requires evidence for every warning. Run the command again with `evidence`.',
      );
      return;
    }

    // 2. Is this warning allowed? (getMember is null for users who aren't in the server)
    if (!target) {
      await interaction.editReply("That user isn't a member of this server.");
      return;
    }
    const problem = whyCantWarn(guild, moderator, target, interaction.memberPermissions);
    if (problem) {
      await interaction.editReply(problem);
      return;
    }

    // 3. Record it: this is the warning itself, so if it fails, stop before telling anyone
    try {
      await createModerationEvent(guild.id, target.id, {
        issuedBy: moderator.id,
        eventType: 'warn',
        reason,
        evidenceUrl: evidence?.url,
      });
    } catch (error) {
      Logger.error(`Couldn't record the warning for ${target.id} in guild ${guild.id}:`, error);
      await interaction.editReply("Something went wrong and the warning wasn't saved. Please try again.");
      return;
    }

    // 4. Tell them. Never throws: closed DMs don't undo the warning.
    const notice = await sendModerationNotice(target, 'warn', reason);

    Logger.info(`${moderator.id} warned ${target.id} in guild ${guild.id}.`);
    // Mentions are shown as names but never ping anyone (allowedMentions)
    await interaction.editReply({
      content:
        `Warned ${target}${reason ? ` for: ${reason}` : '.'}\n` +
        (notice
          ? 'They were notified by DM.'
          : "⚠️ They couldn't be notified: their DMs are probably closed. The warning is still on their record."),
      allowedMentions: { parse: [] },
    });
  },
});

/**
 * Checks whether `moderator` may warn `target`.
 * @returns Why the warning isn't allowed, to show the moderator, or null if it is
 */
function whyCantWarn(
  guild: Guild,
  moderator: GuildMember,
  target: GuildMember,
  moderatorPermissions: Readonly<PermissionsBitField>,
): string | null {
  // The command is hidden from members without Timeout Members by default, but server admins
  // can grant it to anyone in Server Settings → Integrations, so check the real permission
  if (!moderatorPermissions.has(PermissionFlagsBits.ModerateMembers)) {
    return 'You need the Timeout Members permission to warn members.';
  }
  if (target.id === moderator.id) {
    return "You can't warn yourself.";
  }
  // Bots (including Loki) can't read DMs, so a warning would reach no one
  if (target.user.bot) {
    return "Bots can't be warned.";
  }
  if (target.id === guild.ownerId) {
    return "The server owner can't be warned.";
  }
  // Same rule Discord applies to people: you can only act on members ranked below you.
  // The owner outranks everyone regardless of roles.
  if (moderator.id !== guild.ownerId && target.roles.highest.comparePositionTo(moderator.roles.highest) >= 0) {
    return `You can only warn members whose highest role is below yours, and ${target}'s isn't.`;
  }
  return null;
}
