import { Column, Entity, OneToOne, PrimaryColumn } from "typeorm";
import { Guild } from "../../Guild";

@Entity()
export class WarnSettings {
	@PrimaryColumn({ type: "varchar" })
	guildId!: string;

	@OneToOne(() => Guild, (guild) => guild.warnSettings, {
		onDelete: "CASCADE",
	})
	guild!: Guild;

	@Column({ type: "boolean", default: false })
	reasonRequired!: boolean;

	@Column({ type: "boolean", default: false })
	evidenceRequired!: boolean;

	@Column({ type: "boolean", default: false })
	enabled!: boolean;

	constructor(guildId: string) {
		this.guildId = guildId;
	}
}
