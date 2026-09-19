import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from "typeorm";
import { Guild } from "../../Guild";

@Entity()
export class WarnSettings {
	@PrimaryColumn({ type: "varchar" })
	guildId!: string;

	@OneToOne(() => Guild, (guild) => guild.warnSettings, {
		onDelete: "CASCADE",
	})
	@JoinColumn({ name: "guildId" }) // guildId is both the primary key and the foreign key to Guild
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
