import { commandkit, type EventHandler } from 'commandkit';
import { Logger } from 'commandkit/logger';
import { addGuildToDbFailure } from '../../lib/customErrors/addGuildToDbFailure';

const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';

const MAX_RETRIES = 5;
const INITIAL_DELAY_MS = 1000; // 1 second

async function addGuildWithRetry(guild: { id: string; name: string; icon: string | null }, retries = 1): Promise<void> {
  try {
    Logger.log(backendUrl);
    const res = await fetch(`${backendUrl}/guilds`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bot ${process.env.BOT_API_SECRET}`,
      },
      body: JSON.stringify({
        id: guild.id,
        name: guild.name,
        iconHash: guild.icon,
      }),
    });
    Logger.log(res);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    Logger.info(`Successfully added guild ${guild.id} to database.`);
  } catch (error) {
    if (retries < MAX_RETRIES) {
      const delay = INITIAL_DELAY_MS * Math.pow(2, retries);
      Logger.warn(`Failed to add guild ${guild.id} (attempt ${retries}). Retrying in ${delay}ms... (${error})`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return addGuildWithRetry(guild, retries + 1);
    } else {
      Logger.error(`Failed to add guild ${guild.id} after ${MAX_RETRIES} attempts. (${error})`);
      throw error;
    }
  }
}

const handler: EventHandler<'guildCreate'> = async (guild, client) => {
  Logger.info(`Joined a new guild: ${guild.name} (ID: ${guild.id})`);
  // Add guild to database logic here
  // Example: await Database.addGuild(guild.id, guild.name);

  try {
    await addGuildWithRetry({
      id: guild.id,
      name: guild.name,
      icon: guild.icon,
    });
    return;
  } catch (error) {
    Logger.error(`Could not add guild ${guild.id} to database: ${error}`);
    client.emit(
      'error',
      new addGuildToDbFailure(`Failed to add a guild to database on server join`, guild.id, { cause: error as Error }),
    );
  }
};

export default handler;
