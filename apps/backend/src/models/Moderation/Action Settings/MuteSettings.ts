import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from "typeorm";
import { Guild } from "../../Guild";

@Entity()
export class MuteSettings {
	@PrimaryColumn({ type: "varchar" })
	guildId!: string;

	@OneToOne(() => Guild, (guild) => guild.muteSettings, {
		onDelete: "CASCADE",
	})
	@JoinColumn({ name: "guildId" }) // guildId is both the primary key and the foreign key to Guild
	guild!: Guild;

	@Column({ type: "boolean", default: false })
	reasonRequired!: boolean;

	@Column({ type: "boolean", default: false })
	evidenceRequired!: boolean;

	@Column({ type: "varchar", nullable: true, default: null }) // Role given to muted members
	muteRoleId!: string | null;

	@Column({ type: "boolean", default: false })
	enabled!: boolean;

	@Column({ type: "integer", default: 0 }) // In seconds, 0 means permanent mute
	defaultMuteDurationSeconds!: number;

	constructor(guildId: string) {
		this.guildId = guildId;
	}
}
