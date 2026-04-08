# Loki v3

A general-purpose Discord bot with an accompanying web dashboard, built as the third iteration of the Loki project.

> **Status:** Active Development — Alpha. Not yet publicly released.

## Overview

Loki is a feature-rich Discord bot designed for community servers. This iteration focuses on a robust architecture where the bot and web dashboard share a common backend API, enabling efficient caching and a centralized configuration experience.

Previous iterations of Loki are actively deployed and used, with this rewrite focused on scalability, maintainability, and a proper dashboard layer.

## Features

### Web Dashboard
- **Access Control** — Server administrators can manage which users have dashboard access
- **Throw Command Configuration** — Configure the throw command's behaviour per server (in progress)

### Bot Commands *(planned for this iteration)*
- **Throw** — Pings a target user and throws a random item from a configurable list
- **Urban Dictionary** — Queries Urban Dictionary and returns definitions in-channel
- **Moderation** — Standard moderation tooling (ban, kick, mute, etc.)

## Architecture

Loki v3 is structured as a monorepo using Turborepo and pnpm workspaces, consisting of:

- `apps/bot` — Discord bot (Discord.js)
- `apps/web` — Web dashboard (frontend)
- `apps/api` — Backend API server shared by both the bot and dashboard
- `packages/` — Shared configs and utilities

The bot communicates with the backend API rather than directly with the database, allowing shared caching of data accessed by both the dashboard and bot.

## Tech Stack

- **Language:** TypeScript
- **Bot Library:** Discord.js
- **ORM:** TypeORM
- **Database:** PostgreSQL
- **Monorepo:** Turborepo + pnpm

## Getting Started

> Setup instructions will be added when the project reaches a stable state.

## Roadmap

- [ ] Implement throw command in bot
- [ ] Implement Urban Dictionary command
- [ ] Implement moderation commands
- [ ] Complete dashboard configuration pages
- [ ] Public release (Beta)
