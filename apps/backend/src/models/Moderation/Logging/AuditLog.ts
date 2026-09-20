import {
	Column,
	CreateDateColumn,
	Entity,
	ManyToOne,
	PrimaryGeneratedColumn,
} from "typeorm";
import { Guild } from "../../Guild";
import { AuditAction } from "../../../lib/Audit Log/createLog";
import { User } from "../../User";

@Entity("audit_logs")
export class AuditLog {
	@PrimaryGeneratedColumn()
	id!: number;

	@ManyToOne(() => Guild, (guild) => guild.auditLogs)
	guild!: Guild;

	@Column({ type: "varchar" })
	action!: AuditAction;

	// The user the action was performed on, if any
	@ManyToOne(() => User, { onDelete: "SET NULL", eager: false, nullable: true })
	targetUser?: User | null;

	// The user who performed the action
	@ManyToOne(() => User, { onDelete: "SET NULL", eager: false, nullable: true })
	user?: User | null;

	@CreateDateColumn({ type: "timestamptz" })
	createdAt!: Date;

	@Column({ type: "text", nullable: true })
	details?: string | null;
}
