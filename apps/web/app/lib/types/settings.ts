// Shapes of the backend's guild settings routes: GET /guilds/:guildId/settings/<section>
// returns `SettingsResponse[section]`, and PATCH takes `SettingsPatch[section]`.
// Keep in sync with apps/backend/src/routes/guilds/guildId/settings.
//
// Every PATCH replaces the whole section, so a form must send all fields (the
// two exceptions are noted below). Channel and role IDs are Discord snowflakes.

type ModerationActionSettings = {
	guildId: string;
	enabled: boolean;
	reasonRequired: boolean;
	evidenceRequired: boolean;
};

type ModerationActionPatch = Omit<ModerationActionSettings, "guildId">;

/** Response of GET /settings/dashboard. Unlike the other sections it is not a database row. */
export type DashboardSettings = {
	readAccess: string[];
	editAccess: string[];
};

/** PATCH /settings/dashboard needs the Manage Server permission, not just a dashboard edit role. */
export type DashboardSettingsPatch = {
	rolesWithDashboardViewAccess: string[];
	rolesWithDashboardEditAccess: string[];
};

export type BanSettings = ModerationActionSettings & {
	/** 0 = permanent */
	defaultBanDurationSeconds: number;
};
export type BanSettingsPatch = ModerationActionPatch & {
	defaultBanDurationSeconds: number;
};

export type KickSettings = ModerationActionSettings;
export type KickSettingsPatch = ModerationActionPatch;

export type WarnSettings = ModerationActionSettings;
export type WarnSettingsPatch = ModerationActionPatch;

export type MuteSettings = ModerationActionSettings & {
	/** 0 = permanent */
	defaultMuteDurationSeconds: number;
	muteRoleId: string | null;
};
export type MuteSettingsPatch = ModerationActionPatch & {
	defaultMuteDurationSeconds: number;
	muteRoleId: string | null;
};

/** Discord caps a timeout at 28 days (2,419,200 seconds). */
export type TimeoutSettings = ModerationActionSettings & {
	defaultTimeoutDurationSeconds: number;
};
export type TimeoutSettingsPatch = ModerationActionPatch & {
	defaultTimeoutDurationSeconds: number;
};

export type LoggingSettings = {
	guildId: string;
	enabled: boolean;
	defaultLoggingChannelId: string | null;
	logModerationActions: boolean;
	/** null = use the default channel */
	moderationLogChannelId: string | null;
	logMessageEditsAndDeletions: boolean;
	/** null = use the default channel */
	messageLogChannelId: string | null;
	logMemberJoins: boolean;
	logMemberLeaves: boolean;
	/** null = this log is disabled */
	logMemberJoinChannelId: string | null;
	/** null = this log is disabled */
	logMemberLeaveChannelId: string | null;
};
/** `` may be omitted to leave it unchanged; every other field is required. */
export type LoggingSettingsPatch = Omit<LoggingSettings, "guildId">;

export type StarboardSettings = {
	guildId: string;
	enabled: boolean;
	/** null = the starboard is disabled */
	starboardChannelId: string | null;
	/** The stars needed to reach the starboard. Sent back as `starThreshold`, see below. */
	reactionThreshold: number;
	/** A unicode emoji, or `<:name:id>` for a custom one */
	reactionEmoji: string;
};
/** The database column is `reactionThreshold`, but the API takes it as `starThreshold`. */
export type StarboardSettingsPatch = {
	enabled: boolean;
	starboardChannelId: string | null;
	starThreshold: number;
	reactionEmoji: string;
};

export type TicketSettings = {
	guildId: string;
	enabled: boolean;
	notificationChannelId: string | null;
	categoryId: string | null;
	archiveCategoryId: string | null;
	ticketOpenMessage: string;
};
export type TicketSettingsPatch = Omit<TicketSettings, "guildId">;

export type ThrowSettings = {
	guildId: string;
	customItemsEnabled: boolean;
	/** "Disable Default Items": has no effect unless custom items are enabled and there are 20+ */
	customItemsOnly: boolean;
	customItems: string[];
	/** 0 = no cooldown */
	cooldownSeconds: number;
	redirectEnabled: boolean;
	redirectOptInRoleIds: string[];
	whitelistedChannels: string[];
	blacklistedChannels: string[];
};
export type ThrowSettingsPatch = Omit<ThrowSettings, "guildId">;

/** Maps each settings route name to what its GET returns. */
export type SettingsResponse = {
	dashboard: DashboardSettings;
	bans: BanSettings;
	kicks: KickSettings;
	warns: WarnSettings;
	mutes: MuteSettings;
	timeouts: TimeoutSettings;
	logging: LoggingSettings;
	starboard: StarboardSettings;
	tickets: TicketSettings;
	throw: ThrowSettings;
};

/** Maps each settings route name to what its PATCH takes. */
export type SettingsPatch = {
	dashboard: DashboardSettingsPatch;
	bans: BanSettingsPatch;
	kicks: KickSettingsPatch;
	warns: WarnSettingsPatch;
	mutes: MuteSettingsPatch;
	timeouts: TimeoutSettingsPatch;
	logging: LoggingSettingsPatch;
	starboard: StarboardSettingsPatch;
	tickets: TicketSettingsPatch;
	throw: ThrowSettingsPatch;
};

export type SettingsSection = keyof SettingsResponse;
