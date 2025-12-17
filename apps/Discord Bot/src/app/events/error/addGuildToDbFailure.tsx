import { addGuildToDbFailure } from '@/app/lib/customErrors/addGuildToDbFailure';
import { Container, EventHandler, Logger, stopEvents, TextDisplay } from 'commandkit';
import { Channel, GuildBasedChannel, MessageFlags } from 'discord.js';

const CRITICAL_ERROR_LOGGING_CHANNEL_ID = '1450631087125430282';

const handler: EventHandler<'error'> = async (error, client) => {
  Logger.debug('Error event handler triggered.');
  Logger.debug(`Error details: ${error}`);
  if (error instanceof addGuildToDbFailure) {
    // Handle the addGuildToDbFailure error specifically

    Logger.error(`Custom Error Caught: ${error.message}, Guild ID: ${error.guildId}, Date: ${error.date}`);
    // You can add additional handling logic here, such as notifying admins or logging to a monitoring service

    const loggingChannel = await client.channels.fetch(CRITICAL_ERROR_LOGGING_CHANNEL_ID);

    if (loggingChannel && loggingChannel.isTextBased() && loggingChannel.isSendable()) {
      const container = (
        <Container accentColor={'Red'}>
          <TextDisplay
            content={`# Critical Error! \n\n### Error:\n ${error.message}\n### Date:\n ${error.date}\n\n### Cause:\n ${error.cause}`}
          />
        </Container>
      );
      loggingChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    stopEvents();
  } else return;
};
export default handler;
