import { Column, Entity, OneToOne, PrimaryColumn } from "typeorm";
import { Guild } from "../../Guild";

@Entity()
export class BanSettings {
	@PrimaryColumn({ type: "varchar" })
	guildId!: string;

	@OneToOne(() => Guild, (guild) => guild.banSettings, {
		onDelete: "CASCADE",
	})
	guild!: Guild;

	@Column({ type: "boolean", default: false })
	reasonRequired!: boolean;

	@Column({ type: "boolean", default: false })
	evidenceRequired!: boolean;

	@Column({ type: "boolean", default: false })
	enabled!: boolean;

	@Column({ type: "integer", default: 0 }) // In seconds, 0 means permanent ban
	defaultBanDurationSeconds!: number;

	constructor(guildId: string) {
		this.guildId = guildId;
	}
}
