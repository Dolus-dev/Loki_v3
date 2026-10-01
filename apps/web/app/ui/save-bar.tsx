"use client";

import type { SaveStatus } from "../lib/hooks/useSettingsForm";

interface SaveBarProps {
	isDirty: boolean;
	saving: boolean;
	status: SaveStatus;
	onSave: () => void;
	onDiscard: () => void;
	/** When true, shows `readOnlyMessage` instead of the buttons. */
	readOnly: boolean;
	readOnlyMessage?: string;
}

/**
 * The bottom bar of a settings page: Save / Discard plus the outcome of the last save.
 * For users who can't change the settings it's replaced by a view-only notice, so there's
 * no Save button to click.
 */
export default function SaveBar(props: SaveBarProps) {
	const {
		isDirty,
		saving,
		status,
		onSave,
		onDiscard,
		readOnly,
		readOnlyMessage = "You have view-only access. Ask a server admin for a role with dashboard edit access to make changes.",
	} = props;

	if (readOnly) {
		return (
			<div className="mx-10 rounded-md bg-neutral-700/60 px-4 py-3 text-neutral-300">
				{readOnlyMessage}
			</div>
		);
	}

	let statusText: string | null = null;
	let statusClass = "text-neutral-300";
	if (status.kind === "error") {
		statusText = status.message;
		statusClass = "text-danger-400";
	} else if (saving) {
		statusText = "Saving...";
	} else if (isDirty) {
		statusText = "You have unsaved changes.";
	} else if (status.kind === "saved") {
		statusText = "Changes saved.";
		statusClass = "text-brand-500";
	}

	return (
		<div className="mx-10 flex flex-row flex-wrap items-center gap-4">
			<span
				role="status"
				className={`flex-1 ${statusClass}`}>
				{statusText}
			</span>
			<button
				type="button"
				onClick={onDiscard}
				disabled={!isDirty || saving}
				className="px-4 py-2 rounded-md font-semibold bg-neutral-600/50 text-neutral-200 hover:bg-neutral-600/70 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
				Discard
			</button>
			<button
				type="button"
				onClick={onSave}
				disabled={!isDirty || saving}
				className="px-6 py-2 rounded-md font-semibold bg-info-700 text-neutral-200 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
				{saving ? "Saving..." : "Save Changes"}
			</button>
		</div>
	);
}
