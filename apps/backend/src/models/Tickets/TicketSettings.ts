import { Column, Entity, OneToOne, PrimaryColumn } from "typeorm";
import { Guild } from "../Guild";

@Entity()
export class TicketSettings {
	@PrimaryColumn({ type: "varchar" })
	guildId!: string;

	@OneToOne(() => Guild, (guild) => guild.ticketSettings, {
		onDelete: "CASCADE",
	})
	guild!: Guild;

	@Column({ type: "boolean", default: false })
	enabled!: boolean;

	@Column({ type: "varchar", nullable: true, default: null })
	notificationChannelId!: string;

	@Column({ type: "varchar", nullable: true, default: null })
	categoryId!: string;

	@Column({ type: "varchar", nullable: true, default: null })
	archiveCategoryId!: string;

	@Column({
		type: "text",
		default:
			"Please describe the reasoning for opening this ticket; include any information that you think may be relevent, such as proof.",
	})
	ticketOpenMessage!: string;

	constructor(guildId: string) {
		this.guildId = guildId;
	}
}
