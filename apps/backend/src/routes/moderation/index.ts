import express from "express";
import * as z from "zod";
import { AppDataSource } from "../..";
import {
	AuditAction,
	createAuditLogEntry,
} from "../../lib/Audit Log/createLog";
import { requireAuth } from "../../lib/Middlewares/requireAuth";
import { requireBot } from "../../lib/Middlewares/requireBot";
import { discordSnowflake } from "../../lib/validation";
import { LASTING_EVENT_TYPES } from "../../lib/moderationLifecycle";
import {
	ModerationEvents,
	ModerationEventType,
} from "../../models/Moderation/ModerationEvents";
import { User } from "../../models/User";

/**
 * Expiry of temporary moderation events (bans, mutes, timeouts), across all guilds.
 *
 * The backend only stores when an event expires; lifting it in Discord is the bot's job.
 * The bot polls `GET /moderation/expired` for active events whose time is up, undoes each
 * one in Discord (e.g. unbans the user), then reports the outcome with `POST
 * /moderation/expired/:eventId/resolve`, which marks the event "ended" or "failed".
 *
 * Bot-only: dashboard users can't see or resolve events of guilds they may not access.
 */
export const router = express.Router();

router.use(requireAuth, requireBot);

const expiredQuery = z.object({
	// Comma-separated, e.g. "ban,timeout". The bot only asks for types it can lift.
	types: z
		.string()
		.transform((value) => value.split(",").map((type) => type.trim()))
		.pipe(
			z
				.array(z.enum(LASTING_EVENT_TYPES as [ModerationEventType, ...ModerationEventType[]]))
				.min(1),
		),
	limit: z.coerce.number().int().min(1).max(100).default(50),
});

interface ExpiredEvent {
	id: number;
	guildId: string;
	userId: string;
	eventType: ModerationEventType;
	expiresAt: Date;
}

/**
 * Lists active events of the given types whose expiry has passed, oldest expiry first.
 * At most `limit` are returned; the bot gets the rest on its next poll.
 */
router.get("/expired", async (req, res) => {
	const parsed = expiredQuery.safeParse(req.query);
	if (!parsed.success) {
		return res.status(400).send({
			error: "Invalid query parameters",
			details: z.treeifyError(parsed.error),
		});
	}
	const { types, limit } = parsed.data;

	const events: ExpiredEvent[] = await AppDataSource.getRepository(ModerationEvents)
		.createQueryBuilder("event")
		.select("event.id", "id")
		.addSelect(`event."guildId"`, "guildId")
		.addSelect(`event."issuedToId"`, "userId")
		.addSelect(`event."eventType"`, "eventType")
		.addSelect(`event."expiresAt"`, "expiresAt")
		.where(`event."status" = 'active'`)
		// The database's own clock, so "expired" doesn't depend on this server's clock
		.andWhere(`event."expiresAt" <= now()`)
		.andWhere(`event."eventType" IN (:...types)`, { types })
		.orderBy(`event."expiresAt"`, "ASC")
		.limit(limit)
		.getRawMany();

	return res.status(200).send(events);
});

const resolveBody = z.object({
	// "ended": the action was lifted in Discord (or already had been). "failed": it couldn't be.
	outcome: z.enum(["ended", "failed"]),
	// The bot's own user ID, recorded as the actor in the audit log
	resolvedBy: discordSnowflake,
	// What happened, for the audit log, e.g. "Loki lacks the Ban Members permission"
	detail: z.string().trim().max(512).optional(),
});

/**
 * Records how processing an expired event went. Only an event that is still active is
 * changed: if it was superseded or resolved in the meantime, this answers 409 and changes
 * nothing, so a slow bot can never overwrite a newer state.
 */
router.post("/expired/:eventId/resolve", async (req, res) => {
	const eventId = Number(req.params.eventId);
	if (!Number.isInteger(eventId) || eventId <= 0) {
		return res.status(400).send({ error: "Invalid eventId" });
	}

	const parsed = resolveBody.safeParse(req.body);
	if (!parsed.success) {
		return res.status(400).send({
			error: "Invalid request body",
			details: z.treeifyError(parsed.error),
		});
	}
	const { outcome, resolvedBy, detail } = parsed.data;

	try {
		const resolved = await AppDataSource.transaction(async (manager) => {
			const result = await manager
				.createQueryBuilder()
				.update(ModerationEvents)
				.set({ status: outcome, endedAt: () => "now()" })
				.where(`"id" = :eventId AND "status" = 'active'`, { eventId })
				.returning(`"guildId", "issuedToId", "eventType"`)
				.execute();

			const row = (
				result.raw as { guildId: string; issuedToId: string; eventType: string }[]
			)[0];
			if (!row) {
				return false;
			}

			// The audit log needs the actor to exist as a user, like any moderator
			await manager
				.getRepository(User)
				.upsert(
					{ id: resolvedBy },
					{ conflictPaths: ["id"], skipUpdateIfNoValuesChanged: true },
				);

			await createAuditLogEntry(
				{
					action:
						outcome === "ended"
							? AuditAction.MODERATION_EVENT.EXPIRE.ENDED
							: AuditAction.MODERATION_EVENT.EXPIRE.FAILED,
					userId: resolvedBy,
					targetUserId: row.issuedToId,
					guildId: row.guildId,
					details:
						`The ${row.eventType} event #${eventId} expired and ` +
						(outcome === "ended" ? "was lifted" : "could not be lifted") +
						(detail ? `: ${detail}` : "."),
				},
				manager,
			);
			return true;
		});

		if (!resolved) {
			return res
				.status(409)
				.send({ error: "The event is no longer active" });
		}
		return res.status(204).send();
	} catch (error) {
		console.error(`Failed to resolve expired moderation event ${eventId}:`, error);
		return res
			.status(500)
			.send({ error: "Failed to resolve the expired moderation event" });
	}
});
