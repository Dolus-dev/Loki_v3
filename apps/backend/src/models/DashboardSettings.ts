import {
	Column,
	Entity,
	JoinColumn,
	OneToOne,
	PrimaryColumn,
} from "typeorm";
import { Guild } from "./Guild";

@Entity()
export class DashboardSettings {
	@PrimaryColumn({ type: "varchar", unique: true })
	id!: string;

	@OneToOne(() => Guild, (guild) => guild.dashboardSettings, {
		onDelete: "CASCADE",
	})
	@JoinColumn({ name: "id", referencedColumnName: "id" })
	guild!: Guild;

	// Role IDs that can open the dashboard read-only. Users with Manage Server always have access.
	@Column({ type: "varchar", array: true, default: [] })
	rolesWithDashboardViewAccess!: string[];

	// Role IDs that can change settings; these also grant view access
	@Column({ type: "varchar", array: true, default: [] })
	rolesWithDashboardEditAccess!: string[];
}
