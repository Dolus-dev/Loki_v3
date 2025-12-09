import { Column, Entity, OneToOne, PrimaryColumn } from "typeorm";
import { Guild } from "../Guild";

@Entity()
export class StarboardSettings {
	@PrimaryColumn({ type: "varchar" })
	guildId!: string;

	@OneToOne(() => Guild, (guild) => guild.starboardSettings, {
		onDelete: "CASCADE",
	})
	guild!: Guild;

	@Column({ type: "boolean", default: false })
	enabled!: boolean;

	@Column({ type: "integer", default: 5 })
	reactionThreshold!: number;

	@Column({ type: "varchar", default: "⭐" })
	reactionEmoji!: string; // "⭐"  or "<:customEmoji:123456789>"

	@Column({ type: "varchar", default: null, nullable: true })
	starboardChannelId!: string | null; // If null, starboard is disabled
}
