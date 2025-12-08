import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	ManyToOne,
	Relation,
} from "typeorm";
import { User } from "../User";
import { Guild } from "../Guild";

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
	eventType: "ban" | "mute" | "warn" | "timeout" | "kick" | "note";

	@Column({ type: "string", nullable: true })
	evidenceMessageId!: string | null; // ID of the message containing evidence

	@Column({ type: "string", nullable: true })
	evidenceUrl!: string | null; // Direct URL to evidence (e.g., screenshot)

	@Column({ type: "text", nullable: true })
	appealReason?: string | null; // For storing user's appeal reason

	@Column({ type: "boolean", default: false })
	isAppealed!: boolean;

	@Column({ type: "timestamp", default: false })
	appealedAt!: Date | null;

	@Column({ type: "timestamp", nullable: true })
	expiresAt!: Date | null; // For temporary bans/mutes/timeouts

	@ManyToOne(() => User, (user) => user.moderationEventsReceived)
	issuedTo: User;

	@ManyToOne(() => User, (user) => user.moderationEventsIssued)
	issuedBy: User;

	@ManyToOne(() => User, (user) => user.moderationEventsLastUpdated)
	lastUpdatedBy: User;

	@ManyToOne(() => Guild, (guild) => guild.moderationEvents)
	guild: Guild;

	// TODO: Add column relationship linking to Guild entity when created

	@CreateDateColumn()
	createdAt!: Date;

	@UpdateDateColumn()
	updatedAt!: Date;
	constructor(
		reason: string,
		eventType: "ban" | "mute" | "warn" | "timeout" | "kick" | "note",
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
