import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from "typeorm";
import { Guild } from "../Guild";

@Entity()
export class TicketSettings {
	@PrimaryColumn({ type: "varchar" })
	guildId!: string;

	@OneToOne(() => Guild, (guild) => guild.ticketSettings, {
		onDelete: "CASCADE",
	})
	@JoinColumn({ name: "guildId" }) // guildId is both the primary key and the foreign key to Guild
	guild!: Guild;

	@Column({ type: "boolean", default: false })
	enabled!: boolean;

	@Column({ type: "varchar", nullable: true, default: null }) // Channel that ticket notifications are sent to
	notificationChannelId!: string | null;

	@Column({ type: "varchar", nullable: true, default: null }) // Category new ticket channels are created in
	categoryId!: string | null;

	@Column({ type: "varchar", nullable: true, default: null }) // Category closed tickets are moved to
	archiveCategoryId!: string | null;

	@Column({
		type: "text",
		default:
			"Please describe the reasoning for opening this ticket; include any information that you think may be relevant, such as proof.",
	})
	ticketOpenMessage!: string;

	constructor(guildId: string) {
		this.guildId = guildId;
	}
}
