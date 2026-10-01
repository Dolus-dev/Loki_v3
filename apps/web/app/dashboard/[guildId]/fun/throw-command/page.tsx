"use client";

import ChannelMultiSelectMenu from "../../../../ui/channel-multi-select-menu";
import CommaListInput from "../../../../ui/comma-list-input";
import DurationInput from "../../../../ui/duration-input";
import RoleMultiSelectMenu from "../../../../ui/role-multi-select-menu";
import SaveBar from "../../../../ui/save-bar";
import SettingsPage, { FieldError } from "../../../../ui/settings-page";
import Toggle from "../../../../ui/toggle";
import { useGuildAccess } from "../../../../lib/hooks/useGuildAccess";
import {
	useGuildChannels,
	useGuildRoles,
} from "../../../../lib/hooks/useGuildResources";
import { useSettingsForm } from "../../../../lib/hooks/useSettingsForm";

// Backend limit on custom items (see the throw settings route)
const MAX_CUSTOM_ITEMS = 100;

export default function ThrowCommandPage() {
	const { canEdit } = useGuildAccess();
	const { roles } = useGuildRoles();
	const { channels } = useGuildChannels();

	const form = useSettingsForm("throw", {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		toPatch: ({ guildId, ...settings }) => settings,
		canSave: canEdit,
	});
	const { values, setField, fieldErrors, readOnly } = form;

	return (
		<SettingsPage
			title="Throw Settings"
			description={
				<span className="font-semibold">
					A fun command that allows users to throw items between themselves.
				</span>
			}
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
					className="grid xl:grid-cols-2 grid-cols-1 gap-4"
					onSubmit={(e) => {
						e.preventDefault();
						void form.submit();
					}}>
					<div className="flex flex-col gap-2 ml-10">
						<div className="flex flex-col gap-6 mt-5">
							<Toggle
								checked={values.customItemsEnabled}
								onChange={(checked) => setField("customItemsEnabled", checked)}
								label="Enable Custom Items"
								disabled={readOnly}
							/>
							<Toggle
								checked={values.customItemsOnly}
								onChange={(checked) => setField("customItemsOnly", checked)}
								label="Disable Default Items"
								disabled={readOnly || !values.customItemsEnabled}
							/>
							<div className="text-neutral-300 text-sm max-w-130 -mt-3 -mb-2">
								<p>
									Disabling default items will prevent users from throwing the
									built-in items. The toggle will have no effect if custom items
									have been disabled or the list is less than 20 items.
								</p>
							</div>
						</div>

						<div className="flex flex-col mt-5 gap-2">
							<span className="text-neutral-200 font-semibold">Cooldown</span>
							<p className="text-sm text-neutral-300">
								A value of 0 disables the cooldown.
							</p>
						</div>
						<DurationInput
							value={values.cooldownSeconds}
							onChange={(seconds) => setField("cooldownSeconds", seconds)}
							defaultUnit="seconds"
							label="Cooldown"
							disabled={readOnly}
						/>
						<FieldError message={fieldErrors.cooldownSeconds} />

						<Toggle
							checked={values.redirectEnabled}
							onChange={(checked) => setField("redirectEnabled", checked)}
							label="Enable Redirect Chance on Fail"
							className="mt-5"
							disabled={readOnly}
						/>
						<div className="text-neutral-300 text-sm max-w-130">
							<p>
								When enabled, there is a chance that when a user
								&quot;fails&quot; throwing an object, it will be redirected to
								another random user in the server.
							</p>
						</div>

						<span className="text-neutral-200 mt-4 mb-1 font-semibold">
							Redirect Opt-in Roles:
						</span>
						<RoleMultiSelectMenu
							options={roles}
							value={values.redirectOptInRoleIds}
							onChange={(ids) => setField("redirectOptInRoleIds", ids)}
							placeholder="No Roles Selected..."
							className="max-w-130"
							disabled={readOnly}
						/>
						<FieldError message={fieldErrors.redirectOptInRoleIds} />
						<p className="text-sm max-w-130 text-neutral-300">
							Users without any of the listed roles will not be considered for
							receiving redirected throws.
						</p>
					</div>

					<div className="flex flex-col">
						<CommaListInput
							// Remount after a save or discard so the text shows the saved list
							key={form.resetKey}
							value={values.customItems}
							onChange={(items) => setField("customItems", items)}
							label="Custom Items (comma separated):"
							maxItems={MAX_CUSTOM_ITEMS}
							disabled={readOnly || !values.customItemsEnabled}
						/>
						<FieldError message={fieldErrors.customItems} />

						<div className="flex flex-col gap-5 mt-5">
							<div className="flex flex-col w-full">
								<span>Channel Whitelist:</span>
								{/* A channel can't be in both lists, so each hides the other's picks */}
								<ChannelMultiSelectMenu
									options={channels}
									value={values.whitelistedChannels}
									onChange={(ids) => setField("whitelistedChannels", ids)}
									exclude={values.blacklistedChannels}
									placeholder="No Channels Selected..."
									disabled={readOnly}
								/>
								<FieldError message={fieldErrors.whitelistedChannels} />
							</div>

							<p className="text-sm text-neutral-300 -mt-2">
								The whitelist takes precedence over the blacklist. If both are
								empty, the command will be usable in all channels.
							</p>
							<div className="flex flex-col w-full">
								<span>Channel Blacklist:</span>
								<ChannelMultiSelectMenu
									options={channels}
									value={values.blacklistedChannels}
									onChange={(ids) => setField("blacklistedChannels", ids)}
									exclude={values.whitelistedChannels}
									placeholder="No Channels Selected..."
									disabled={readOnly}
								/>
								<FieldError message={fieldErrors.blacklistedChannels} />
							</div>
						</div>
					</div>

					<FieldError message={fieldErrors._form} />
				</form>
			)}
		</SettingsPage>
	);
}
