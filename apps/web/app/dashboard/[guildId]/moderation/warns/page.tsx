"use client";

import ModerationSettingsForm, {
	useModerationForm,
} from "../_components/moderation-settings-form";

export default function WarnSettingsPage() {
	const form = useModerationForm("warns");

	return (
		<ModerationSettingsForm
			action="warn"
			form={form}
			description={
				<span className="font-semibold">
					Warnings put a formal note on a member&apos;s record without removing
					them from the server.
				</span>
			}
		/>
	);
}
