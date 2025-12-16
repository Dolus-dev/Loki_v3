import type { EventHandler } from 'commandkit';
import { Logger } from 'commandkit/logger';

const handler: EventHandler<'guildCreate'> = async (guild, client) => {
  Logger.info(`Joined a new guild: ${guild.name} (ID: ${guild.id})`);
  // Add guild to database logic here
  // Example: await Database.addGuild(guild.id, guild.name);
};

export default handler;
