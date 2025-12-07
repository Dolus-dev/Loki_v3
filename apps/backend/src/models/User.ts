import { Column, Entity, PrimaryColumn, OneToMany, JoinColumn } from "typeorm";

import { ModerationEvents } from "./Moderation";

@Entity()
export class User {
	@PrimaryColumn({ type: "varchar", unique: true })
	id: string;

	@Column({ type: "varchar", nullable: true })
	username: string;

	@Column({ type: "varchar", nullable: true })
	avatarHash: string | null;

	@Column({ type: "varchar", nullable: true })
	accessToken: string;

	@Column({ type: "varchar", nullable: true })
	refreshToken: string;

	@OneToMany(() => ModerationEvents, (event) => event.issuedTo)
	moderationEventsReceived!: ModerationEvents[];

	@OneToMany(() => ModerationEvents, (event) => event.issuedBy)
	moderationEventsIssued!: ModerationEvents[];

	@OneToMany(() => ModerationEvents, (event) => event.lastUpdatedBy)
	moderationEventsLastUpdated!: ModerationEvents[];

	constructor(
		id: string,
		username: string,
		accessToken: string,
		refreshToken: string,
		avatarHash?: string | null
	) {
		this.id = id;
		this.username = username;
		this.accessToken = accessToken;
		this.refreshToken = refreshToken;
		this.avatarHash = avatarHash || null;
	}
}
