import { Colors, ContainerBuilder, Events, MessageFlags, TextDisplayBuilder } from 'discord.js';
import { env } from '../../../config/env.js';
import { Logger } from '../../../framework/logger.js';
import { defineEvent } from '../../../framework/types.js';
import { addGuildToDbFailure } from '../../lib/customErrors/addGuildToDbFailure.js';

/**
 * Handles the client's `error` event: errors from discord.js itself, plus our own custom errors
 * that handlers raise with `client.emit('error', ...)`.
 *
 * An addGuildToDbFailure is reported to CRITICAL_ERROR_CHANNEL_ID, since it means a guild is
 * missing from the database. Any other error is written to the log.
 */
export default defineEvent({
  name: Events.Error,

  async execute(error, client) {
    if (!(error instanceof addGuildToDbFailure)) {
      Logger.error('Discord client error:', error);
      return;
    }

    Logger.error(`Custom Error Caught: ${error.message}, Guild ID: ${error.guildId}, Date: ${error.date}`);

    if (!env.CRITICAL_ERROR_CHANNEL_ID) return;

    const loggingChannel = await client.channels.fetch(env.CRITICAL_ERROR_CHANNEL_ID);
    if (!loggingChannel?.isSendable()) return;

    const container = new ContainerBuilder()
      .setAccentColor(Colors.Red)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Critical Error! \n\n### Error:\n ${error.message}\n### Date:\n ${error.date}\n\n### Cause:\n ${error.cause}`,
        ),
      );

    await loggingChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
  },
});
