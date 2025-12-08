import { Column, Entity, OneToOne, PrimaryColumn } from "typeorm";
import { Guild } from "./Guild";

@Entity()
export class DashboardSettings {
	@PrimaryColumn({ type: "varchar" })
	guildId!: string;

	@OneToOne(() => Guild, (guild) => guild.dashboardSettings, {
		onDelete: "CASCADE",
	})
	guild!: Guild;

	@Column({ type: "varchar", array: true, default: [] })
	rolesWithDashboardViewAccess!: string[];

	@Column({ type: "varchar", array: true, default: [] })
	rolesWithDashboardEditAccess!: string[];
}
