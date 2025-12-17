import { Container, type EventHandler, Logger, Section, TextDisplay, Thumbnail } from 'commandkit';
import { MessageFlags } from 'discord.js';

const LOGGING_CHANNEL_ID = '1450636734747508869';

const handler: EventHandler<'guildCreate'> = async (guild, client) => {
  Logger.info(`Joined a new guild: ${guild.name} (ID: ${guild.id})`);

  const loggingChannel = await client.channels.fetch(LOGGING_CHANNEL_ID);

  if (loggingChannel && loggingChannel.isTextBased() && loggingChannel.isSendable()) {
    const container = (
      <Container accentColor={'Blue'}>
        {guild.icon != null ? (
          <Section>
            <TextDisplay
              content={`# Joined New Guild!\n\n### Guild Name: \n${guild.name}\n\n### Guild ID: \n${guild.id}`}
            />
            <Thumbnail url={guild.iconURL({ size: 512, extension: 'png' }) as string} />
          </Section>
        ) : (
          <TextDisplay
            content={`# Joined New Guild!\n\n### Guild Name: \n${guild.name}\n\n### Guild ID: \n${guild.id}`}
          />
        )}
      </Container>
    );

    loggingChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};

export default handler;
