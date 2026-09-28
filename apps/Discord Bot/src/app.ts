import { Client, GatewayIntentBits } from 'discord.js';

/**
 * The bot's single discord.js client.
 *
 * Intents decide which gateway events Discord sends us. Only ask for what's needed:
 * - Guilds: guild/channel/role events, including guildCreate. Required for almost everything.
 * - GuildMembers (privileged): member join/leave/update events.
 * - GuildMessages: message create/update/delete events in guilds.
 * - MessageContent (privileged): the text of those messages, e.g. for message logging.
 *
 * Privileged intents must be switched on in the developer portal (Bot tab), and once the bot is
 * in 100+ servers Discord has to approve them.
 */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

export default client;
