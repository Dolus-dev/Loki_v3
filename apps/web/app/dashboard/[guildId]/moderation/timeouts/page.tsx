"use client";

import DurationInput from "../../../../ui/duration-input";
import { FieldError } from "../../../../ui/settings-page";
import ModerationSettingsForm, {
	useModerationForm,
} from "../_components/moderation-settings-form";

// Discord's limit on a timeout's length: 28 days (the backend enforces the same cap)
const MAX_TIMEOUT_SECONDS = 28 * 24 * 60 * 60;

export default function TimeoutSettingsPage() {
	const form = useModerationForm("timeouts");
	const { values, setField, fieldErrors, readOnly } = form;

	return (
		<ModerationSettingsForm
			action="timeout"
			form={form}
			description={
				<span className="font-semibold">
					Timeouts use Discord&apos;s built-in timeout: the member can read but
					can&apos;t talk, react or join voice until it ends.
				</span>
			}>
			{values && (
				<>
					<span className="text-neutral-200 font-semibold">
						Default timeout duration
					</span>
					<p className="text-sm text-neutral-300 max-w-130">
						Used when a moderator doesn&apos;t give a duration. A value of 0 means
						there&apos;s no default, so moderators must choose one each time.
						Discord limits timeouts to 28 days.
					</p>
					<DurationInput
						value={values.defaultTimeoutDurationSeconds}
						onChange={(seconds) =>
							setField("defaultTimeoutDurationSeconds", seconds)
						}
						max={MAX_TIMEOUT_SECONDS}
						defaultUnit="minutes"
						label="Default timeout duration"
						disabled={readOnly}
					/>
					<FieldError message={fieldErrors.defaultTimeoutDurationSeconds} />
				</>
			)}
		</ModerationSettingsForm>
	);
}
