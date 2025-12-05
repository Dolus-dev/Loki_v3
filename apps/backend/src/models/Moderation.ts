import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	ManyToOne,
	Relation,
} from "typeorm";
import { User } from "./User";

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

	@ManyToOne(() => User, (user) => user.moderationEventsReceived)
	issuedTo: User;

	@ManyToOne(() => User, (user) => user.moderationEventsIssued)
	issuedBy: User;

	@ManyToOne(() => User, (user) => user.moderationEventsLastUpdated)
	lastUpdatedBy: User;

	@CreateDateColumn()
	createdAt!: Date;

	@UpdateDateColumn()
	updatedAt!: Date;
	constructor(
		reason: string,
		eventType: "ban" | "mute" | "warn" | "timeout" | "kick" | "note",
		issuedTo: User,
		issuedBy: User,
		lastUpdatedBy: User
	) {
		this.reason = reason;
		this.eventType = eventType;
		this.issuedTo = issuedTo;
		this.issuedBy = issuedBy;
		this.lastUpdatedBy = lastUpdatedBy;
	}
}
