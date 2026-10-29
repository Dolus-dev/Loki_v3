import { TimeoutRegistry } from './timeoutRegistry.js';

export const expiryTimers = new TimeoutRegistry();

export function expiryTimerKey(guildId: string, userId: string, eventType: ExpiringEventType): string {
  return `${guildId}:${userId}:${eventType}`;
}

enum ExpiringEventType {
  Ban = 'ban',
  Mute = 'mute',
}
