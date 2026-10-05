import {
  Colors,
  ContainerBuilder,
  DiscordAPIError,
  MessageFlags,
  RESTJSONErrorCodes,
  TextDisplayBuilder,
  type GuildMember,
  type Message,
} from 'discord.js';
import { Logger } from '../../framework/logger.js';

/**
 * The DMs a member gets when a moderation action is taken against them.
 *
 * Each notice is a template with placeholders, filled in when it's sent:
 *   {server}  the server's name
 *   {user}    the member's username
 *   {reason}  the moderator's reason, or "No reason provided"
 *   {duration} how long the action lasts, e.g. "7 days, until <timestamp>" or "Permanent"
 *             (only for actions that have a duration, like bans)
 *
 * The moderator's name is deliberately not offered: telling a punished member who acted
 * invites retaliation.
 *
 * Today every server gets `DEFAULT_NOTICE_TEMPLATES`. Custom messages (planned, set by server
 * admins in the dashboard) will be templates in the same format, passed to
 * `sendModerationNotice` as `options.template`. Cap them at a few thousand characters when that's
 * built: the text goes in a Text Display component, which Discord limits to 4000.
 */

/**
 * The events that notify the member. Extend as more moderation commands are added.
 * `unmute` is sent when a moderator lifts a mute early with /unmute; `muteExpired` is sent
 * by the expiry processor when a temporary mute runs out. `timeoutRemoved` is sent by
 * /remove-timeout; a timeout that simply runs out gets no notice.
 */
export type NoticeAction = 'warn' | 'kick' | 'ban' | 'mute' | 'unmute' | 'muteExpired' | 'timeout' | 'timeoutRemoved';

export const DEFAULT_NOTICE_TEMPLATES: Record<NoticeAction, string> = {
  warn: '## You received a warning in {server}\n**Reason:** {reason}\n\nThis warning has been added to your record in the server.',
  kick: '## You were kicked from {server}\n**Reason:** {reason}\n\nYou can rejoin the server if you have a new invite.',
  ban: '## You were banned from {server}\n**Reason:** {reason}\n**Duration:** {duration}',
  mute: "## You were muted in {server}\n**Reason:** {reason}\n**Duration:** {duration}\n\nYou can still read the server, but you can't talk until the mute ends.",
  unmute: '## You were unmuted in {server}\n**Reason:** {reason}\n\nYou can talk again.',
  muteExpired: '## Your mute in {server} has ended\nYou can talk again.',
  timeout:
    "## You were timed out in {server}\n**Reason:** {reason}\n**Duration:** {duration}\n\nYou can still read the server, but you can't send messages, react or join voice until it ends.",
  timeoutRemoved: '## Your timeout in {server} was removed\n**Reason:** {reason}\n\nYou can talk again.',
};

/** Accent color down the side of each notice. */
const NOTICE_COLORS: Record<NoticeAction, number> = {
  warn: Colors.DarkGold,
  kick: Colors.Orange,
  ban: Colors.Red,
  mute: Colors.Gold,
  unmute: Colors.Green,
  muteExpired: Colors.Green,
  timeout: Colors.Yellow,
  timeoutRemoved: Colors.Green,
};

export interface NoticeValues {
  server: string;
  user: string;
  reason: string;
  duration?: string;
}

/**
 * Fills in a template's placeholders. Unknown placeholders, and ones without a value (like
 * {duration} for a kick), are left as written. Values are inserted in a single pass, so a
 * reason that itself contains "{server}" isn't expanded again.
 */
export function renderNotice(template: string, values: NoticeValues): string {
  return template.replace(/\{(\w+)\}/g, (placeholder, key: string) => {
    const value = Object.hasOwn(values, key) ? values[key as keyof NoticeValues] : undefined;
    return value ?? placeholder;
  });
}

/**
 * DMs a member about an action taken against them. Call it *before* removing them from the
 * server (kick, ban): afterwards the bot usually shares no server with them and can't DM them.
 *
 * Never throws: many members have DMs from server members turned off, which mustn't stop
 * the moderation action itself.
 * @param options.duration Fills {duration}, for actions that have one
 * @param options.template The notice text; defaults to the built-in template for `action`
 * @returns The sent message (so it can be deleted if the action then fails), or null if the
 * member couldn't be messaged
 */
export async function sendModerationNotice(
  member: GuildMember,
  action: NoticeAction,
  reason: string | undefined,
  options: { duration?: string; template?: string } = {},
): Promise<Message | null> {
  const text = renderNotice(options.template ?? DEFAULT_NOTICE_TEMPLATES[action], {
    server: member.guild.name,
    user: member.user.username,
    reason: reason ?? 'No reason provided',
    duration: options.duration,
  });

  const container = new ContainerBuilder()
    .setAccentColor(NOTICE_COLORS[action])
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));

  try {
    return await member.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
  } catch (error) {
    // "Cannot send messages to this user" just means their DMs are closed; anything else is unexpected
    if (error instanceof DiscordAPIError && error.code === RESTJSONErrorCodes.CannotSendMessagesToThisUser) {
      Logger.debug(`Couldn't DM ${member.id} about their ${action}: their DMs are closed.`);
    } else {
      Logger.warn(`Couldn't DM ${member.id} about their ${action}:`, error);
    }
    return null;
  }
}
