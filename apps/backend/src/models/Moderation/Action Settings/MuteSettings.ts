import { Column, Entity, OneToOne, PrimaryColumn } from "typeorm";
import { Guild } from "../../Guild";

@Entity()
export class MuteSettings {
	@PrimaryColumn({ type: "varchar" })
	guildId!: string;

	@OneToOne(() => Guild, (guild) => guild.muteSettings, {
		onDelete: "CASCADE",
	})
	guild!: Guild;

	@Column({ type: "boolean", default: false })
	reasonRequired!: boolean;

	@Column({ type: "boolean", default: false })
	evidenceRequired!: boolean;

	@Column({ type: "varchar", nullable: true, default: null })
	muteRoleId!: string;

	@Column({ type: "boolean", default: false })
	enabled!: boolean;

	constructor(guildId: string) {
		this.guildId = guildId;
	}
}
