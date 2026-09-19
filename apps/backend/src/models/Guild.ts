import {
	Column,
	Entity,
	OneToMany,
	OneToOne,
	PrimaryColumn,
} from "typeorm";
import { ModerationEvents } from "./Moderation/ModerationEvents";
import { AuditLog } from ".//Moderation/Logging/AuditLog";
import { DashboardSettings } from "./DashboardSettings";
import { MuteSettings } from "./Moderation/Action Settings/MuteSettings";
import { KickSettings } from "./Moderation/Action Settings/KickSettings";
import { BanSettings } from "./Moderation/Action Settings/BanSettings";
import { TimeoutSettings } from "./Moderation/Action Settings/TimeoutSettings";
import { WarnSettings } from "./Moderation/Action Settings/WarnSettings";
import { TicketSettings } from "./Tickets/TicketSettings";
import { LoggingSettings } from "./Moderation/Logging/ServerLoggingSettings";
import { Tickets } from "./Tickets/Tickets";
import { ThrowCommand } from "./Fun/Throw";
import { StarboardSettings } from "./Fun/Starboard";

/**
 * A Discord guild the bot is in. Each per-feature settings entity is linked
 * one-to-one and shares the guild's ID as its primary key.
 */
@Entity()
export class Guild {
	@PrimaryColumn({ type: "varchar", unique: true })
	id: string;

	@Column({ type: "varchar" })
	name: string;

	@Column({ type: "varchar", nullable: true })
	iconHash: string | null;

	@OneToMany(() => ModerationEvents, (event) => event.guild, { eager: false })
	moderationEvents!: ModerationEvents[];

	@OneToMany(() => AuditLog, (auditLog) => auditLog.guild, { eager: false })
	auditLogs!: AuditLog[];

	@OneToOne(() => DashboardSettings, (settings) => settings.guild, {
		cascade: true,
		eager: false,
	})
	dashboardSettings!: DashboardSettings;

	@OneToOne(() => MuteSettings, (settings) => settings.guild, {
		cascade: true,
		eager: false,
	})
	muteSettings!: MuteSettings;

	@OneToOne(() => KickSettings, (settings) => settings.guild, {
		cascade: true,
		eager: false,
	})
	kickSettings!: KickSettings;

	@OneToOne(() => BanSettings, (settings) => settings.guild, {
		cascade: true,
		eager: false,
	})
	banSettings!: BanSettings;

	@OneToOne(() => TimeoutSettings, (settings) => settings.guild, {
		cascade: true,
		eager: false,
	})
	timeoutSettings!: TimeoutSettings;

	@OneToOne(() => WarnSettings, (settings) => settings.guild, {
		cascade: true,
		eager: false,
	})
	warnSettings!: WarnSettings;

	@OneToOne(() => TicketSettings, (settings) => settings.guild, {
		cascade: true,
		eager: false,
	})
	ticketSettings!: TicketSettings;

	@OneToOne(() => LoggingSettings, (settings) => settings.guild, {
		cascade: true,
		eager: false,
	})
	loggingSettings!: LoggingSettings;

	@OneToMany(() => Tickets, (tickets) => tickets.guild)
	tickets!: Tickets[];

	@OneToOne(() => ThrowCommand, (settings) => settings.guild, {
		cascade: true,
		eager: false,
	})
	throwCommand!: ThrowCommand;

	@OneToOne(() => StarboardSettings, (settings) => settings.guild, {
		cascade: true,
		eager: false,
	})
	starboardSettings!: StarboardSettings;

	constructor(id: string, name: string, iconHash?: string | null) {
		this.id = id;
		this.name = name;
		this.iconHash = iconHash || null;
	}
}
