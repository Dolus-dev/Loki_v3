import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	ManyToOne,
	Index,
} from "typeorm";
import { User } from "../User";
import { Guild } from "../Guild";

export type ModerationEventType =
	| "ban"
	| "mute"
	| "warn"
	| "timeout"
	| "kick"
	| "note";

/**
 * Where a lasting action (ban, mute, timeout) is in its life. Instant events (warn, kick, note)
 * have no status.
 * - active: in effect right now. At most one per user, guild and action type.
 * - superseded: replaced by a newer event of the same action type (see supersededBy).
 * - ended: it ran its course or was cleared.
 * - failed: it should have ended but the bot could not lift it.
 */
export type ModerationEventStatus = "active" | "superseded" | "ended" | "failed";

// The database allows only one active event per user, guild and action type, so a newer
// event can never sit next to an older one that is still active.
@Index(
	"UQ_one_active_moderation_event_per_user_and_type",
	["guild", "issuedTo", "eventType"],
	{ unique: true, where: `"status" = 'active'` },
)
@Entity()
export class ModerationEvents {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({ type: "varchar" })
	reason: string;

	@Column({
		type: "enum",
		enum: ["ban", "mute", "warn", "timeout", "kick", "note"],
	})
	eventType: ModerationEventType;

	@Column({
		type: "enum",
		enum: ["active", "superseded", "ended", "failed"],
		nullable: true,
		default: null,
	})
	status!: ModerationEventStatus | null;

	// When the action stopped being in effect (set when it is superseded or ended)
	@Column({ type: "timestamptz", nullable: true })
	endedAt!: Date | null;

	// The newer event that replaced this one, when status is "superseded"
	@ManyToOne(() => ModerationEvents, { nullable: true, onDelete: "SET NULL" })
	supersededBy!: ModerationEvents | null;

	@Column({ type: "varchar", nullable: true })
	evidenceMessageId!: string | null; // ID of the message containing evidence

	@Column({ type: "varchar", nullable: true })
	evidenceUrl!: string | null; // Direct URL to evidence (e.g., screenshot)

	@Column({ type: "text", nullable: true })
	appealReason?: string | null; // For storing user's appeal reason

	@Column({ type: "boolean", default: false })
	isAppealed!: boolean;

	// All timestamps carry a time zone, so a moment means the same thing whatever the time
	// zone of the server or database (matters when comparing expiresAt with the current time)
	@Column({ type: "timestamptz", default: null })
	appealedAt!: Date | null;

	@Column({ type: "timestamptz", nullable: true })
	expiresAt!: Date | null; // For temporary bans/mutes/timeouts; null means permanent

	// The moderated user, the moderator who issued the event, and whoever last edited its reason
	@ManyToOne(() => User, (user) => user.moderationEventsReceived)
	issuedTo: User;

	@ManyToOne(() => User, (user) => user.moderationEventsIssued)
	issuedBy: User;

	@ManyToOne(() => User, (user) => user.moderationEventsLastUpdated)
	lastUpdatedBy: User;

	@ManyToOne(() => Guild, (guild) => guild.moderationEvents)
	guild: Guild;

	@CreateDateColumn({ type: "timestamptz" })
	createdAt!: Date;

	@UpdateDateColumn({ type: "timestamptz" })
	updatedAt!: Date;
	constructor(
		reason: string,
		eventType: ModerationEventType,
		issuedTo: User,
		issuedBy: User,
		lastUpdatedBy: User,
		guild: Guild,
		evidenceUrl?: string | null
	) {
		this.reason = reason;
		this.eventType = eventType;
		this.issuedTo = issuedTo;
		this.issuedBy = issuedBy;
		this.lastUpdatedBy = lastUpdatedBy;
		this.guild = guild;
		this.evidenceUrl = evidenceUrl || null;
	}
}
