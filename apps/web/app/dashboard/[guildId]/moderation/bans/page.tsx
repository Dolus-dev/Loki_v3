"use client";

import DurationInput from "../../../../ui/duration-input";
import { FieldError } from "../../../../ui/settings-page";
import ModerationSettingsForm, {
	useModerationForm,
} from "../_components/moderation-settings-form";

export default function BanSettingsPage() {
	const form = useModerationForm("bans");
	const { values, setField, fieldErrors, readOnly } = form;

	return (
		<ModerationSettingsForm
			action="ban"
			form={form}
			description={
				<span className="font-semibold">
					Banning removes a member from the server and stops them from rejoining
					until the ban ends or is lifted.
				</span>
			}>
			{values && (
				<>
					<span className="text-neutral-200 font-semibold">
						Default ban duration
					</span>
					<p className="text-sm text-neutral-300 max-w-130">
						Used when a moderator doesn&apos;t give a duration. A value of 0
						makes bans permanent by default.
					</p>
					<DurationInput
						value={values.defaultBanDurationSeconds}
						onChange={(seconds) =>
							setField("defaultBanDurationSeconds", seconds)
						}
						defaultUnit="days"
						label="Default ban duration"
						disabled={readOnly}
					/>
					<FieldError message={fieldErrors.defaultBanDurationSeconds} />
				</>
			)}
		</ModerationSettingsForm>
	);
}
