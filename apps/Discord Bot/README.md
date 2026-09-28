# Loki Discord Bot

Plain [discord.js](https://discord.js.org) with a small file-based loader in `src/framework`, no bot framework.

## Running

1. Copy `.env.example` to `.env` and fill it in. Set `DEV_GUILD_ID` to your test server so command changes show up instantly.
2. `pnpm dev`: runs `src/` through tsx and restarts on every save.

For production: `pnpm build` (cleans and compiles to `dist/`), then `pnpm start`.

## Layout

```
src/
  index.ts          entry point: load commands/events, log in, sync slash commands
  app.ts            the discord.js Client and its intents
  config/env.ts     validated environment variables (import `env` from here)
  framework/        the loader: commands.ts, events.ts, loadModules.ts, logger.ts, types.ts
  app/
    commands/       one slash command per file (subfolders allowed)
    events/<name>/  one listener per file, grouped in a folder named after the event
    lib/            shared helpers
```

Files or folders starting with `_` are ignored by the loader, so helpers can live next to commands.

## Adding a command

```ts
// src/app/commands/hello.ts
import { SlashCommandBuilder } from 'discord.js';
import { defineCommand } from '../../framework/types.js';

export default defineCommand({
  data: new SlashCommandBuilder().setName('hello').setDescription('Say hello'),
  async execute(interaction) {
    await interaction.reply(`Hello, ${interaction.user}!`);
  },
});
```

Commands are synced to Discord automatically every time the bot starts.

## Adding an event listener

```ts
// src/app/events/guildDelete/log.ts
import { Events } from 'discord.js';
import { Logger } from '../../../framework/logger.js';
import { defineEvent } from '../../../framework/types.js';

export default defineEvent({
  name: Events.GuildDelete,
  async execute(guild, client) {
    Logger.info(`Left guild ${guild.id}`);
  },
});
```

Imports between source files must end in `.js` (even though the files are `.ts`). Node requires this for ES modules.
