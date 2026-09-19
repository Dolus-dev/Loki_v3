import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from "typeorm";
import { Guild } from "../../Guild";

@Entity()
export class BanSettings {
	@PrimaryColumn({ type: "varchar" })
	guildId!: string;

	@OneToOne(() => Guild, (guild) => guild.banSettings, {
		onDelete: "CASCADE",
	})
	@JoinColumn({ name: "guildId" }) // guildId is both the primary key and the foreign key to Guild
	guild!: Guild;

	@Column({ type: "boolean", default: false })
	reasonRequired!: boolean;

	@Column({ type: "boolean", default: false })
	evidenceRequired!: boolean;

	// Not currently exposed by the /settings/bans routes
	@Column({ type: "boolean", default: false })
	enabled!: boolean;

	@Column({ type: "integer", default: 0 }) // In seconds, 0 means permanent ban
	defaultBanDurationSeconds!: number;

	constructor(guildId: string) {
		this.guildId = guildId;
	}
}
