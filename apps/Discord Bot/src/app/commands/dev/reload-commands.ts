import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { reloadCommands } from '../../../framework/commands.js';
import { Logger } from '../../../framework/logger.js';
import { defineCommand } from '../../../framework/types.js';

/**
 * /reload-commands: puts command changes live without restarting the bot.
 *
 * Workflow in production: pull the new code, run `pnpm build` (which rewrites dist/), then run
 * this command in the dev server. It re-reads every file in app/commands, swaps them in, and
 * re-syncs the command list with Discord.
 *
 * Not covered, restart instead: changes to events, to app/lib helpers, or to the framework, since
 * those are only loaded once at startup.
 */
export default defineCommand({
  devOnly: true,

  data: new SlashCommandBuilder()
    .setName('reload-commands')
    .setDescription('Reload command files from disk and re-sync them with Discord.')
    // Hidden from non-admins by default; server settings can grant it to specific people instead
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    // Reloading + syncing can take a few seconds, longer than the 3s Discord allows for a first reply
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const { global, dev } = await reloadCommands(interaction.client);
      Logger.info(`Commands reloaded by ${interaction.user.tag} (${interaction.user.id}).`);
      await interaction.editReply(`Reloaded commands: ${global} global, ${dev} dev-only.`);
    } catch (error) {
      Logger.error('Reloading commands failed:', error);

      const cause = error instanceof Error && error.cause instanceof Error ? `\n${error.cause.message}` : '';
      const message = error instanceof Error ? error.message : String(error);
      await interaction.editReply(`Reload failed:\n\`\`\`\n${message}${cause}\n\`\`\``);
    }
  },
});
