"use client";

import RoleMultiSelectMenu from "../../../../ui/role-multi-select-menu";
import SaveBar from "../../../../ui/save-bar";
import SettingsPage, { FieldError } from "../../../../ui/settings-page";
import { useGuildAccess } from "../../../../lib/hooks/useGuildAccess";
import { useGuildRoles } from "../../../../lib/hooks/useGuildResources";
import { useSettingsForm } from "../../../../lib/hooks/useSettingsForm";

// Changing who has dashboard access needs Manage Server itself (the backend enforces this
// with requireManageGuild), so even dashboard "edit" roles see this page read-only
const MANAGE_SERVER_ONLY =
	"Only members with the Manage Server permission can change dashboard access.";

export default function DashboardAccessPage() {
	const { canManageAccess } = useGuildAccess();
	const { roles } = useGuildRoles();

	const form = useSettingsForm("dashboard", {
		// GET and PATCH name these fields differently
		toPatch: (data) => ({
			rolesWithDashboardViewAccess: data.readAccess,
			rolesWithDashboardEditAccess: data.editAccess,
		}),
		canSave: canManageAccess,
		forbiddenMessage: MANAGE_SERVER_ONLY,
	});
	const { values, setField, fieldErrors, readOnly } = form;

	return (
		<SettingsPage
			title="Dashboard Access"
			description={
				<>
					<span className="font-semibold">
						Control who can view and edit the dashboard based on their assigned
						roles in your server.
					</span>
					<span className="text-neutral-300 font-medium">
						Users that are granted &quot;Manage Server&quot; permissions have
						access to all dashboard features automatically.
					</span>
				</>
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
					readOnlyMessage={MANAGE_SERVER_ONLY}
				/>
			}>
			{values && (
				<form
					className="grid xl:grid-cols-2 grid-cols-1 gap-4"
					onSubmit={(e) => {
						e.preventDefault();
						void form.submit();
					}}>
					<div className="flex-col flex gap-2 md:ml-10">
						<span className="text-lg font-medium text-neutral-200">
							Roles with Edit Access
						</span>
						<RoleMultiSelectMenu
							options={roles}
							value={values.rolesWithDashboardEditAccess}
							onChange={(ids) => setField("rolesWithDashboardEditAccess", ids)}
							placeholder="No roles with edit access..."
							className="max-w-130"
							disabled={readOnly}
						/>
						<FieldError message={fieldErrors.rolesWithDashboardEditAccess} />
					</div>
					<div className="flex-col flex gap-2 md:ml-10">
						<span className="text-lg font-medium text-neutral-200">
							Roles with View Access
						</span>
						<RoleMultiSelectMenu
							options={roles}
							value={values.rolesWithDashboardViewAccess}
							onChange={(ids) => setField("rolesWithDashboardViewAccess", ids)}
							placeholder="No roles with view access..."
							className="max-w-130"
							disabled={readOnly}
						/>
						<FieldError message={fieldErrors.rolesWithDashboardViewAccess} />
					</div>
					<FieldError message={fieldErrors._form} />
				</form>
			)}
		</SettingsPage>
	);
}
