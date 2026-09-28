import { Events } from 'discord.js';
import { env } from '../../../config/env.js';
import { Logger } from '../../../framework/logger.js';
import { defineEvent } from '../../../framework/types.js';
import { addGuildToDbFailure } from '../../lib/customErrors/addGuildToDbFailure.js';

const MAX_RETRIES = 5;
const INITIAL_DELAY_MS = 1000; // 1 second

async function addGuildWithRetry(guild: { id: string; name: string; icon: string | null }, retries = 1): Promise<void> {
  try {
    const res = await fetch(`${env.BACKEND_URL}/guilds`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bot ${env.BOT_API_SECRET}`,
      },
      body: JSON.stringify({
        id: guild.id,
        name: guild.name,
        iconHash: guild.icon,
      }),
    });

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

export default defineEvent({
  name: Events.GuildCreate,

  async execute(guild, client) {
    Logger.info(`Joined a new guild: ${guild.name} (ID: ${guild.id})`);

    try {
      await addGuildWithRetry({
        id: guild.id,
        name: guild.name,
        icon: guild.icon,
      });
    } catch (error) {
      Logger.error(`Could not add guild ${guild.id} to database: ${error}`);
      // Hand the failure to the `error` event handlers (see events/error/addGuildToDbFailure.ts)
      client.emit(
        'error',
        new addGuildToDbFailure(`Failed to add a guild to database on server join`, guild.id, {
          cause: error as Error,
        }),
      );
    }
  },
});
