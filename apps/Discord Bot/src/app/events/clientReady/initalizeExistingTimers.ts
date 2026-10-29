import { Events } from 'discord.js';
import { defineEvent } from '../../../framework/types.js';
import { getExpiredModerationEvents } from '../../lib/backend.js';

/** Once logged in, start initializing expiry timers for existing moderation events from the DB.*/

export default defineEvent({
  name: Events.ClientReady,
  once: true,

  async execute(client) {
    // Fetch existing moderation events from the backend and initialize timers for them
  },
});
