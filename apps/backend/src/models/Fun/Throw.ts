import { Column, Entity, OneToOne, PrimaryColumn } from "typeorm";
import { Guild } from "../Guild";

@Entity()
export class ThrowCommand {
	@PrimaryColumn({ type: "varchar" })
	guildId!: string;

	@OneToOne(() => Guild, (guild) => guild.throwCommand, {
		onDelete: "CASCADE",
	})
	guild!: Guild;

	@Column({ type: "boolean", default: false })
	customItemsOnly!: boolean;

	@Column({ type: "varchar", array: true, default: [] })
	customItems!: string[];

	@Column({ type: "integer", default: 0 })
	cooldownSeconds!: number;

	@Column({ type: "varchar", array: true, default: [] })
	whitelistedChannels!: string[];

	@Column({ type: "varchar", array: true, default: [] })
	blacklistedChannels!: string[];
}
