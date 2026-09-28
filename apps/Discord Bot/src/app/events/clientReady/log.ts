import { Events } from 'discord.js';
import { Logger } from '../../../framework/logger.js';
import { defineEvent } from '../../../framework/types.js';

export default defineEvent({
  name: Events.ClientReady,
  once: true,

  async execute(client) {
    Logger.info(`Logged in as ${client.user.username}!`);
  },
});
