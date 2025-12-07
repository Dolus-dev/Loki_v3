import { Column, Entity, OneToMany, PrimaryColumn } from "typeorm";
import { ModerationEvents } from "./Moderation";

@Entity()
export class Guild {
	@PrimaryColumn({ type: "varchar", unique: true })
	id: string;

	@Column({ type: "varchar" })
	name: string;

	@Column({ type: "varchar", nullable: true })
	iconHash: string | null;

	@OneToMany(() => ModerationEvents, (event) => event.guild)
	moderationEvents!: ModerationEvents[];

	constructor(id: string, name: string, iconHash?: string | null) {
		this.id = id;
		this.name = name;
		this.iconHash = iconHash || null;
	}
}
