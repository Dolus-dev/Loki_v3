import { Column, Entity, PrimaryColumn, OneToMany, JoinColumn } from "typeorm";

import { ModerationEvents } from "./Moderation";

@Entity()
export class User {
	@PrimaryColumn({ type: "int", unique: true })
	id: number;

	@Column({ type: "varchar" })
	username: string;

	@Column({ type: "varchar", nullable: true })
	avatarHash: string | null;

	@Column({ type: "varchar" })
	accessToken: string;

	@Column({ type: "varchar" })
	refreshToken: string;

	@OneToMany(() => ModerationEvents, (event) => event.issuedTo)
	moderationEventsReceived!: ModerationEvents[];

	@OneToMany(() => ModerationEvents, (event) => event.issuedBy)
	moderationEventsIssued!: ModerationEvents[];

	@OneToMany(() => ModerationEvents, (event) => event.lastUpdatedBy)
	moderationEventsLastUpdated!: ModerationEvents[];

	constructor(
		id: number,
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
