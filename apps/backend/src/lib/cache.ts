import { redisClient } from "..";

/**
 * Redis is only a cache here, so a Redis failure must never fail a request: a read
 * that fails counts as a miss, and a write or delete that fails is skipped. The
 * routes then fall back to the database or Discord.
 */

/** Reads a cached string, or null on a miss or if Redis is unavailable */
export async function cacheGet(key: string): Promise<string | null> {
	try {
		return await redisClient.get(key);
	} catch (error) {
		console.error(`Cache read failed for ${key}:`, error);
		return null;
	}
}

/** Caches a string for `ttlSeconds`; does nothing if Redis is unavailable */
export async function cacheSet(
	key: string,
	value: string,
	ttlSeconds: number,
): Promise<void> {
	try {
		await redisClient.set(key, value, { EX: ttlSeconds });
	} catch (error) {
		console.error(`Cache write failed for ${key}:`, error);
	}
}

/** Removes a cached value; does nothing if Redis is unavailable */
export async function cacheDel(key: string): Promise<void> {
	try {
		await redisClient.del(key);
	} catch (error) {
		console.error(`Cache delete failed for ${key}:`, error);
	}
}
