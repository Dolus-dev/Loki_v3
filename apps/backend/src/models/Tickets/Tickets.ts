import { Column, Entity, ManyToOne, PrimaryColumn } from "typeorm";
import { Guild } from "../Guild";

@Entity()
export class Tickets {
	@PrimaryColumn({ type: "varchar" })
	guildId!: string;

	@ManyToOne(() => Guild, (guild) => guild.tickets, {
		onDelete: "CASCADE",
	})
	guild!: Guild;

	@Column({ type: "boolean", default: false })
	adminOnly!: boolean;

	@Column({ type: "varchar" })
	ticketChannelId!: string;

	@Column({ type: "varchar" }) // ID of the user who opened the ticket
	ticketOwnerId!: string;

	@Column({ type: "varchar", array: true }) // IDs of users involved in the ticket
	ticketParticipantIds!: string[];

	constructor(guildId: string) {
		this.guildId = guildId;
	}
}
