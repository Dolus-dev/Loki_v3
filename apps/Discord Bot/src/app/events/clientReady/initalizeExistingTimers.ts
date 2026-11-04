import { Events } from 'discord.js';
import { defineEvent } from '../../../framework/types.js';
import { getExpiredModerationEvents, getModerationEvents } from '../../lib/backend.js';

/** Once logged in, start initializing expiry timers for existing moderation events from the DB.*/

export default defineEvent({
  name: Events.ClientReady,
  once: true,

  async execute(client) {
    // Fetch existing moderation events from the backend and initialize timers for them
    let cursor: string | undefined = undefined;

    do {
      const page = await getModerationEvents({
        cursor,
        limit: 100,
        isActive: true,
        sortBy: 'expiresAt',
        sortOrder: 'ASC',
      });

      for (const event of page.data) {
      }
      cursor = page.pagination.nextCursor ?? undefined;
    } while (cursor);
  },
});
