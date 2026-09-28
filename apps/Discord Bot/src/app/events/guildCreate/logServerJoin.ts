import {
  Colors,
  ContainerBuilder,
  Events,
  MessageFlags,
  SectionBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
} from 'discord.js';
import { env } from '../../../config/env.js';
import { defineEvent } from '../../../framework/types.js';

/** Posts a "joined a new guild" card to LOG_CHANNEL_ID whenever the bot is added to a server. */
export default defineEvent({
  name: Events.GuildCreate,

  async execute(guild, client) {
    if (!env.LOG_CHANNEL_ID) return;

    const loggingChannel = await client.channels.fetch(env.LOG_CHANNEL_ID);
    if (!loggingChannel?.isSendable()) return;

    // Components V2 layout: a blue container holding the text, with the guild icon shown as a
    // thumbnail beside it when the guild has one. A thumbnail can only live inside a section.
    const text = new TextDisplayBuilder().setContent(
      `# Joined New Guild!\n\n### Guild Name: \n${guild.name}\n\n### Guild ID: \n${guild.id}`,
    );
    const container = new ContainerBuilder().setAccentColor(Colors.Blue);

    const iconUrl = guild.iconURL({ size: 512, extension: 'png' });
    if (iconUrl) {
      container.addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(text)
          .setThumbnailAccessory(new ThumbnailBuilder().setURL(iconUrl)),
      );
    } else {
      container.addTextDisplayComponents(text);
    }

    await loggingChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
  },
});
