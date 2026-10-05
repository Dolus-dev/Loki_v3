"use client";

import ModerationSettingsForm, {
	useModerationForm,
} from "../_components/moderation-settings-form";

export default function KickSettingsPage() {
	const form = useModerationForm("kicks");

	return (
		<ModerationSettingsForm
			action="kick"
			form={form}
			description={
				<span className="font-semibold">
					Kicking removes a member from the server. They can rejoin with a new
					invite.
				</span>
			}
		/>
	);
}
