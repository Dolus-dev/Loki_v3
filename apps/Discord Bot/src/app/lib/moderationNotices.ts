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
 *
 * The moderator's name is deliberately not offered: telling a punished member who acted
 * invites retaliation.
 *
 * Today every server gets `DEFAULT_NOTICE_TEMPLATES`. Custom messages (planned, set by server
 * admins in the dashboard) will be templates in the same format, passed to
 * `sendModerationNotice` as `template`. Cap them at a few thousand characters when that's
 * built: the text goes in a Text Display component, which Discord limits to 4000.
 */

/** The actions that notify the member. Extend as more moderation commands are added. */
export type NoticeAction = 'kick';

export const DEFAULT_NOTICE_TEMPLATES: Record<NoticeAction, string> = {
  kick: '## You were kicked from {server}\n**Reason:** {reason}\n\nYou can rejoin the server if you have a new invite.',
};

/** Accent color down the side of each notice. */
const NOTICE_COLORS: Record<NoticeAction, number> = {
  kick: Colors.Orange,
};

export interface NoticeValues {
  server: string;
  user: string;
  reason: string;
}

/**
 * Fills in a template's placeholders. Unknown placeholders are left as written, and values are
 * inserted in a single pass, so a reason that itself contains "{server}" isn't expanded again.
 */
export function renderNotice(template: string, values: NoticeValues): string {
  return template.replace(/\{(\w+)\}/g, (placeholder, key: string) =>
    Object.hasOwn(values, key) ? values[key as keyof NoticeValues] : placeholder,
  );
}

/**
 * DMs a member about an action taken against them. Call it *before* removing them from the
 * server (kick, ban): afterwards the bot usually shares no server with them and can't DM them.
 *
 * Never throws: many members have DMs from server members turned off, which mustn't stop
 * the moderation action itself.
 * @param template The notice text; defaults to the built-in template for `action`
 * @returns The sent message (so it can be deleted if the action then fails), or null if the
 * member couldn't be messaged
 */
export async function sendModerationNotice(
  member: GuildMember,
  action: NoticeAction,
  reason: string | undefined,
  template: string = DEFAULT_NOTICE_TEMPLATES[action],
): Promise<Message | null> {
  const text = renderNotice(template, {
    server: member.guild.name,
    user: member.user.username,
    reason: reason ?? 'No reason provided',
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
