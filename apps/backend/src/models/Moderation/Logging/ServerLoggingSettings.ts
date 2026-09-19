import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from "typeorm";
import { Guild } from "./../../Guild";

@Entity()
export class LoggingSettings {
	@PrimaryColumn({ type: "varchar" })
	guildId!: string;

	@OneToOne(() => Guild, (guild) => guild.loggingSettings, {
		onDelete: "CASCADE",
	})
	@JoinColumn({ name: "guildId" }) // guildId is both the primary key and the foreign key to Guild
	guild!: Guild;

	@Column({ type: "boolean", default: false })
	enabled!: boolean;

	@Column({ type: "varchar", default: null, nullable: true })
	defaultLoggingChannelId!: string | null;

	@Column({ type: "boolean", default: false })
	logModerationActions!: boolean;

	@Column({ type: "varchar", nullable: true }) // If null, uses default channel
	moderationLogChannelId!: string | null;

	@Column({ type: "boolean", default: false })
	logMessageEditsAndDeletions!: boolean;

	@Column({ type: "varchar", nullable: true }) // If null, uses default channel
	messageLogChannelId!: string | null;

	@Column({ type: "boolean", default: false })
	logMemberJoins!: boolean;

	@Column({ type: "boolean", default: false })
	logMemberLeaves!: boolean;

	@Column({ type: "varchar", nullable: true }) // If null, auto-disable
	logMemberJoinChannelId!: string | null;

	@Column({ type: "varchar", nullable: true }) // If null, auto-disable
	logMemberLeaveChannelId!: string | null;

	constructor(guildId: string) {
		this.guildId = guildId;
	}
}
