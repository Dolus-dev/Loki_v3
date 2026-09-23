import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from "typeorm";
import { Guild } from "../Guild";

@Entity()
export class ThrowSettings {
	@PrimaryColumn({ type: "varchar" })
	guildId!: string;

	@OneToOne(() => Guild, (guild) => guild.throwSettings, {
		onDelete: "CASCADE",
	})
	@JoinColumn({ name: "guildId" }) // guildId is both the primary key and the foreign key to Guild
	guild!: Guild;

	@Column({ type: "boolean", default: false })
	customItemsEnabled!: boolean; // If true, customItems can be thrown as well as the built-in items

	// The dashboard's "Disable Default Items": only customItems can be thrown. Has no effect
	// unless custom items are enabled and there are at least 20 of them.
	@Column({ type: "boolean", default: false })
	customItemsOnly!: boolean;

	@Column({ type: "varchar", array: true, default: [] })
	customItems!: string[];

	@Column({ type: "integer", default: 0 }) // In seconds, 0 disables the cooldown
	cooldownSeconds!: number;

	@Column({ type: "boolean", default: false })
	redirectEnabled!: boolean; // If true, a failed throw can be redirected to another random user

	// Only members with one of these roles can receive a redirected throw
	@Column({ type: "varchar", array: true, default: [] })
	redirectOptInRoleIds!: string[];

	// The whitelist takes precedence over the blacklist; if both are empty the command works everywhere
	@Column({ type: "varchar", array: true, default: [] })
	whitelistedChannels!: string[];

	@Column({ type: "varchar", array: true, default: [] })
	blacklistedChannels!: string[];
}
