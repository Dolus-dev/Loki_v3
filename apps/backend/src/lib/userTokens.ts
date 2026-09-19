import { Request } from "express";
import { AppDataSource } from "..";
import { User } from "../models/User";
import { DiscordError } from "./Errors/APIErrorResponse";
import { refreshToken } from "./discordInteractions";

type UserTokens = { accessToken: string; refreshToken: string };

// Refreshes currently running, by user ID. Discord invalidates a refresh token as soon
// as it is used, so concurrent requests for one user must share a single refresh.
const refreshesInFlight = new Map<string, Promise<UserTokens>>();

/**
 * Gets a new access/refresh token pair for a user and saves it to the database.
 * The refresh token stored in the database is preferred over the session's, since it
 * is the most recently issued one.
 */
function refreshUserTokens(
	userId: string,
	sessionRefreshToken: string | undefined,
): Promise<UserTokens> {
	const running = refreshesInFlight.get(userId);
	if (running) {
		return running;
	}

	const refresh = (async () => {
		const userRepository = AppDataSource.getRepository(User);
		// The token columns are `select: false`, so this is the one place that asks for one
		const user = await userRepository
			.createQueryBuilder("user")
			.addSelect("user.refreshToken")
			.where("user.id = :userId", { userId })
			.getOne();

		const storedRefreshToken = user?.refreshToken ?? sessionRefreshToken;
		if (!storedRefreshToken) {
			throw new DiscordError(401, "No refresh token available");
		}

		const result = await refreshToken(storedRefreshToken);

		await userRepository.update(
			{ id: userId },
			{
				accessToken: result.access_token,
				refreshToken: result.refresh_token,
			},
		);

		return {
			accessToken: result.access_token,
			refreshToken: result.refresh_token,
		};
	})().finally(() => refreshesInFlight.delete(userId));

	refreshesInFlight.set(userId, refresh);
	return refresh;
}

/**
 * Runs a Discord call made on behalf of the logged-in user, refreshing their token if it expired.
 *
 * If Discord answers 401, the user's refresh token is exchanged for a new token pair, which is
 * saved to the session and the database, and the call is retried once. If the refresh token
 * itself is no longer valid, a 401 DiscordError is thrown so the user is sent back to login.
 * @param req The request; its session holds the user's tokens and is updated on refresh
 * @param call The Discord call, given the access token to use
 */
export async function withUserAccessToken<T>(
	req: { session: Request["session"] },
	call: (accessToken: string) => Promise<T>,
): Promise<T> {
	const accessToken = req.session.accessToken;
	if (!accessToken) {
		throw new DiscordError(401, "No access token in session");
	}

	try {
		return await call(accessToken);
	} catch (error) {
		const userId = req.session.userId;
		if (!(error instanceof DiscordError) || error.statusCode !== 401 || !userId) {
			throw error;
		}

		let tokens: UserTokens;
		try {
			tokens = await refreshUserTokens(userId, req.session.refreshToken);
		} catch (refreshError) {
			// Discord rejects a revoked or expired refresh token with a 4xx
			if (
				refreshError instanceof DiscordError &&
				refreshError.statusCode >= 400 &&
				refreshError.statusCode < 500
			) {
				throw new DiscordError(401, "Discord session expired", refreshError);
			}
			throw refreshError;
		}

		req.session.accessToken = tokens.accessToken;
		req.session.refreshToken = tokens.refreshToken;

		return await call(tokens.accessToken);
	}
}
