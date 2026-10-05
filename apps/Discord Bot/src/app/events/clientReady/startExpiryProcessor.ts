import { Events } from 'discord.js';
import { defineEvent } from '../../../framework/types.js';
import { startExpiryProcessor } from '../../lib/expiryProcessor.js';

/** Once logged in, start lifting temporary bans/mutes/timeouts as they expire (see lib/expiryProcessor.ts). */
export default defineEvent({
  name: Events.ClientReady,
  once: true,

  async execute(client) {
    startExpiryProcessor(client);
  },
});
