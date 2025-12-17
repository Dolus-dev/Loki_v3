import {
	BeforeInsert,
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

	@Column({ type: "varchar", array: true, default: [] })
	rolesWithDashboardViewAccess!: string[];

	@Column({ type: "varchar", array: true, default: [] })
	rolesWithDashboardEditAccess!: string[];

	@BeforeInsert()
	setId() {
		if (this.guild && this.guild.id) {
			this.id = this.guild.id;
		}
	}
}
