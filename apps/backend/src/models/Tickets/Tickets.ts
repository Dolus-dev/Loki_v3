import {
	Column,
	CreateDateColumn,
	Entity,
	Index,
	JoinColumn,
	JoinTable,
	ManyToMany,
	ManyToOne,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from "typeorm";
import { Guild } from "../Guild";
import { User } from "../User";

@Entity()
export class Tickets {
	@PrimaryGeneratedColumn()
	id!: number;

	@Index() // Tickets are looked up by the guild they belong to
	@Column({ type: "varchar" })
	guildId!: string;

	// Shares the guildId column above as its foreign key
	@ManyToOne(() => Guild, (guild) => guild.tickets, {
		onDelete: "CASCADE",
	})
	@JoinColumn({ name: "guildId" })
	guild!: Guild;

	@Column({ type: "boolean", default: false })
	adminOnly!: boolean;

	@Index({ unique: true }) // Each ticket has its own channel
	@Column({ type: "varchar" })
	ticketChannelId!: string;

	// The user who opened the ticket. Users are linked like in ModerationEvents and AuditLog
	// (so their row always exists); the ticket is kept if the user is ever deleted.
	@ManyToOne(() => User, { onDelete: "SET NULL", eager: false, nullable: true })
	owner?: User | null;

	// Everyone involved in the ticket
	@ManyToMany(() => User, { eager: false })
	@JoinTable({
		name: "ticket_participants",
		joinColumn: { name: "ticketId" },
		inverseJoinColumn: { name: "userId" },
	})
	participants!: User[];

	@CreateDateColumn()
	createdAt!: Date;

	@UpdateDateColumn()
	updatedAt!: Date;

	constructor(guildId: string) {
		this.guildId = guildId;
	}
}
