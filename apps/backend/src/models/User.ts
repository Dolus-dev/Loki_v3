import { Column, Entity, PrimaryColumn, OneToMany } from "typeorm";

import { ModerationEvents } from "./Moderation/ModerationEvents";
import { encryptedColumn } from "../lib/crypto";

@Entity()
export class User {
	@PrimaryColumn({ type: "varchar", unique: true, nullable: false })
	id: string;

	@Column({ type: "varchar", nullable: true })
	username: string;

	@Column({ type: "varchar", nullable: true })
	avatarHash: string | null;

	// Discord OAuth tokens from login (replaced whenever they are refreshed, see
	// lib/userTokens.ts); encrypted at rest by the column transformer. Null for users
	// only created as moderation targets/issuers who have never logged in.
	// `select: false` keeps them out of every query (including joins that end up in API
	// responses); code that needs one must select it explicitly, see lib/userTokens.ts.
	@Column({
		type: "varchar",
		nullable: true,
		select: false,
		transformer: encryptedColumn,
	})
	accessToken: string;

	@Column({
		type: "varchar",
		nullable: true,
		select: false,
		transformer: encryptedColumn,
	})
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
