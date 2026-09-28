import { SlashCommandBuilder } from 'discord.js';
import { defineCommand } from '../../framework/types.js';

export default defineCommand({
  data: new SlashCommandBuilder().setName('ping').setDescription("Ping the bot to check if it's online."),

  async execute(interaction) {
    // ws.ping is -1 until the first heartbeat round-trip completes
    await interaction.reply(`Pong! Latency: ${interaction.client.ws.ping}ms`);
  },
});
