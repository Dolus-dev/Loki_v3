"use client";

import { useState } from "react";
import { parseFieldErrors } from "../api";
import type {
	SettingsPatch,
	SettingsResponse,
	SettingsSection,
} from "../types/settings";
import { useGuildAccess } from "./useGuildAccess";
import { useGuildSettings } from "./useGuildSettings";
import { useUnsavedChangesWarning } from "./useUnsavedChangesWarning";

export type SaveStatus =
	| { kind: "idle" }
	| { kind: "saved" }
	| { kind: "error"; message: string };

interface SettingsFormOptions<S extends SettingsSection> {
	/**
	 * Converts what GET returns into what PATCH takes. Usually just drops `guildId`, but
	 * some sections name fields differently (dashboard: `readAccess` →
	 * `rolesWithDashboardViewAccess`).
	 */
	toPatch: (data: SettingsResponse[S]) => SettingsPatch[S];
	/** Whether the user may change this section; when false the form is read-only. */
	canSave: boolean;
	/** Message for a 403 on save. Defaults to a generic "no permission" message. */
	forbiddenMessage?: string;
}

/**
 * Form state for one settings section: loads it, tracks unsaved edits, saves, and turns
 * the backend's answers into messages a page can show.
 *
 * Only the user's *edits* are stored. `values` is the edits if there are any, else the
 * saved settings. So:
 * - a background refetch (e.g. SWR revalidating on window focus) shows up automatically
 *   when nothing is being edited, and never overwrites edits in progress;
 * - saving or discarding just drops the edits, and the form shows the saved settings.
 *
 * While there are unsaved edits, leaving the page asks for confirmation first (see
 * `useUnsavedChangesWarning`).
 *
 * `resetKey` changes whenever the edits are dropped. Inputs that keep their own text
 * state (like a comma-separated list) can use it as a React `key` to start over.
 */
export function useSettingsForm<S extends SettingsSection>(
	section: S,
	options: SettingsFormOptions<S>,
) {
	const { toPatch, canSave, forbiddenMessage } = options;
	const { data, error, isLoading, save } = useGuildSettings(section);
	const { revalidate: revalidateAccess } = useGuildAccess();

	const [edits, setEdits] = useState<SettingsPatch[S] | null>(null);
	const [saving, setSaving] = useState(false);
	const [status, setStatus] = useState<SaveStatus>({ kind: "idle" });
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
	const [resetKey, setResetKey] = useState(0);

	const saved = data ? toPatch(data) : undefined;
	const values = edits ?? saved;
	const isDirty =
		edits !== null && JSON.stringify(edits) !== JSON.stringify(saved);
	const readOnly = !canSave;

	// Ask before navigating away (or closing the tab) with unsaved edits
	useUnsavedChangesWarning(isDirty);

	/** Changes one field. Ignored while loading or read-only. */
	const setField = <K extends keyof SettingsPatch[S]>(
		key: K,
		value: SettingsPatch[S][K],
	) => {
		if (!saved || readOnly) {
			return;
		}
		setEdits((current) => ({ ...(current ?? saved), [key]: value }));
		setStatus({ kind: "idle" });
		// The field's old error no longer applies to the new value
		setFieldErrors((current) => {
			const next = { ...current };
			delete next[key as string];
			return next;
		});
	};

	const dropEdits = () => {
		setEdits(null);
		setFieldErrors({});
		setResetKey((key) => key + 1);
	};

	/** Throws away unsaved edits. */
	const reset = () => {
		dropEdits();
		setStatus({ kind: "idle" });
	};

	/** Saves the edits. Resolves when done; the outcome is reported through `status`. */
	const submit = async () => {
		if (readOnly || !isDirty || !edits || saving) {
			return;
		}

		setSaving(true);
		setFieldErrors({});
		// useGuildSettings refetches the section after a successful save, so by the time
		// this resolves `data` already holds what the backend stored
		const result = await save(edits);
		setSaving(false);

		if (result.ok) {
			dropEdits();
			setStatus({ kind: "saved" });
			return;
		}

		switch (result.status) {
			case 0:
				setStatus({ kind: "error", message: "Could not reach the server. Try again in a moment." });
				break;
			case 400:
				setFieldErrors(parseFieldErrors(result.details));
				setStatus({ kind: "error", message: "Some fields are invalid. Check the highlighted settings." });
				break;
			case 403:
				// Access changed since the page loaded: re-check it, which switches the page to
				// read-only (or out of the guild entirely) if it was reduced
				revalidateAccess();
				setStatus({
					kind: "error",
					message: forbiddenMessage ?? "You no longer have permission to change these settings.",
				});
				break;
			case 404:
				setStatus({ kind: "error", message: "This server isn't set up with Loki yet." });
				break;
			default:
				setStatus({ kind: "error", message: result.message });
		}
	};

	return {
		/** Current form values (edits or saved settings); undefined until loaded. */
		values,
		setField,
		isDirty,
		isLoading,
		/** The load error, if the settings couldn't be fetched (an `ApiError` for HTTP errors). */
		loadError: error as unknown,
		saving,
		status,
		/** Per-field validation messages from the last save; `_form` is for the whole form. */
		fieldErrors,
		submit,
		reset,
		readOnly,
		resetKey,
	};
}
