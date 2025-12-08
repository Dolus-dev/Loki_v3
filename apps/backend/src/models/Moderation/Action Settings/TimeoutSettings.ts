import { Column, Entity, OneToOne, PrimaryColumn } from "typeorm";
import { Guild } from "../../Guild";

@Entity()
export class TimeoutSettings {
	@PrimaryColumn({ type: "varchar" })
	guildId!: string;

	@OneToOne(() => Guild, (guild) => guild.timeoutSettings, {
		onDelete: "CASCADE",
	})
	guild!: Guild;

	@Column({ type: "boolean", default: false })
	reasonRequired!: boolean;

	@Column({ type: "boolean", default: false })
	evidenceRequired!: boolean;

	@Column({ type: "boolean", default: false })
	enabled!: boolean;

	@Column({ type: "integer", default: 1800 }) // In seconds, 0 means no default timeout. Default is 30 minutes
	defaultTimeoutDurationSeconds!: number;

	constructor(guildId: string) {
		this.guildId = guildId;
	}
}
