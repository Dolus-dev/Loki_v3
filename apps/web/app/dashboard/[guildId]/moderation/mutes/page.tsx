"use client";

import { useGuildRoles } from "../../../../lib/hooks/useGuildResources";
import DurationInput from "../../../../ui/duration-input";
import RoleSelectMenu from "../../../../ui/role-select-menu";
import { FieldError } from "../../../../ui/settings-page";
import ModerationSettingsForm, {
	useModerationForm,
} from "../_components/moderation-settings-form";

export default function MuteSettingsPage() {
	const form = useModerationForm("mutes");
	const { values, setField, fieldErrors, readOnly } = form;
	const { roles } = useGuildRoles();

	return (
		<ModerationSettingsForm
			action="mute"
			form={form}
			description={
				<span className="font-semibold">
					Muting gives a member a role that stops them from talking, until the
					mute ends or is lifted.
				</span>
			}>
			{values && (
				<>
					<span className="text-neutral-200 font-semibold">Mute role</span>
					<p className="text-sm text-neutral-300 max-w-130">
						The role given to muted members. Its channel permissions decide what
						a muted member can&apos;t do.
					</p>
					{/* The mute command can't work without a role, so once one is set it can
					    only be swapped for another, not cleared */}
					<RoleSelectMenu
						options={roles}
						value={values.muteRoleId}
						onChange={(roleId) => setField("muteRoleId", roleId)}
						allowNone={false}
						placeholder="Select a mute role..."
						className="max-w-130"
						disabled={readOnly}
					/>
					<FieldError message={fieldErrors.muteRoleId} />

					<span className="text-neutral-200 font-semibold mt-5">
						Default mute duration
					</span>
					<p className="text-sm text-neutral-300 max-w-130">
						Used when a moderator doesn&apos;t give a duration. A value of 0
						makes mutes permanent by default.
					</p>
					<DurationInput
						value={values.defaultMuteDurationSeconds}
						onChange={(seconds) =>
							setField("defaultMuteDurationSeconds", seconds)
						}
						defaultUnit="hours"
						label="Default mute duration"
						disabled={readOnly}
					/>
					<FieldError message={fieldErrors.defaultMuteDurationSeconds} />
				</>
			)}
		</ModerationSettingsForm>
	);
}
