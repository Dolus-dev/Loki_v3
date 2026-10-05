"use client";

import { ReactNode } from "react";
import { useGuildAccess } from "../../../../lib/hooks/useGuildAccess";
import {
	type SaveStatus,
	useSettingsForm,
} from "../../../../lib/hooks/useSettingsForm";
import type {
	SettingsPatch,
	WarnSettingsPatch,
} from "../../../../lib/types/settings";
import SaveBar from "../../../../ui/save-bar";
import SettingsPage, { FieldError } from "../../../../ui/settings-page";
import Toggle from "../../../../ui/toggle";
import ModerationTabs from "./moderation-tabs";

/**
 * Shared pieces of the moderation tab pages (warns, kicks, bans, mutes, timeouts).
 *
 * Every action has the same three settings: on/off, reason required, evidence required.
 * `ModerationSettingsForm` renders those plus the page frame (title, tabs, save bar); a
 * tab page only adds its own extra fields, like a default duration, as `children`.
 */

export type ModerationSection = "warns" | "kicks" | "bans" | "mutes" | "timeouts";

/** The settings every moderation action has. (Warns have exactly these and nothing else.) */
type CommonSettings = WarnSettingsPatch;
type CommonKey = keyof CommonSettings;

/** Form state for one moderation action's settings (see `useSettingsForm`). */
export function useModerationForm<S extends ModerationSection>(section: S) {
	const { canEdit } = useGuildAccess();

	return useSettingsForm(section, {
		// GET returns the row with its guildId; PATCH takes everything else. That holds for
		// all five sections (see lib/types/settings.ts), but TypeScript can't prove it for a
		// generic `S`, hence the cast
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		toPatch: ({ guildId, ...settings }) => settings as unknown as SettingsPatch[S],
		canSave: canEdit,
	});
}

/** The parts of a `useModerationForm` result this component needs, for any section. */
interface ModerationFormState {
	values: CommonSettings | undefined;
	setField: (key: CommonKey, value: boolean) => void;
	fieldErrors: Record<string, string>;
	readOnly: boolean;
	isLoading: boolean;
	loadError: unknown;
	isDirty: boolean;
	saving: boolean;
	status: SaveStatus;
	submit: () => Promise<void>;
	reset: () => void;
}

interface ModerationSettingsFormProps {
	/** The action in a sentence, singular and lowercase, e.g. "warn" or "timeout". */
	action: string;
	form: ModerationFormState;
	description: ReactNode;
	/** Fields specific to this action, shown beside the common toggles. */
	children?: ReactNode;
}

export default function ModerationSettingsForm(
	props: ModerationSettingsFormProps,
) {
	const { action, form, description, children } = props;
	const { values, setField, fieldErrors, readOnly } = form;

	const commonToggles: { key: CommonKey; label: string; help: string }[] = [
		{
			key: "enabled",
			label: `Enable ${action}s`,
			help: `When off, moderators can't ${action} members with Loki.`,
		},
		{
			key: "reasonRequired",
			label: "Require a reason",
			help: `Moderators must give a reason for every ${action}.`,
		},
		{
			key: "evidenceRequired",
			label: "Require evidence",
			help: `Moderators must attach evidence (like a screenshot or message link) to every ${action}.`,
		},
	];

	return (
		<SettingsPage
			title="Moderation"
			tabs={<ModerationTabs />}
			description={description}
			isLoading={form.isLoading}
			loadError={form.loadError}
			footer={
				<SaveBar
					isDirty={form.isDirty}
					saving={form.saving}
					status={form.status}
					onSave={form.submit}
					onDiscard={form.reset}
					readOnly={readOnly}
				/>
			}>
			{values && (
				<form
					className="grid xl:grid-cols-2 grid-cols-1 gap-8"
					onSubmit={(e) => {
						e.preventDefault();
						void form.submit();
					}}>
					<div className="flex flex-col gap-5 ml-10 mt-2">
						{commonToggles.map(({ key, label, help }) => (
							<div
								key={key}
								className="flex flex-col gap-1">
								<Toggle
									checked={values[key]}
									onChange={(checked) => setField(key, checked)}
									label={label}
									disabled={readOnly}
								/>
								<p className="text-sm text-neutral-300 max-w-130">{help}</p>
								<FieldError message={fieldErrors[key]} />
							</div>
						))}
					</div>

					{children && (
						<div className="flex flex-col gap-2 ml-10 xl:ml-0 mt-2">
							{children}
						</div>
					)}

					<FieldError message={fieldErrors._form} />
				</form>
			)}
		</SettingsPage>
	);
}
