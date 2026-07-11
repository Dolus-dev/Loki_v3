"use client";

import { useEffect, useState } from "react";
import { FaTriangleExclamation } from "react-icons/fa6";
import MultiSelectMenu from "../../../../ui/multi-select-menu";
import RoleMultiSelectMenu, {
	ReturnedRole,
} from "../../../../ui/role-multi-select-menu";
import { useParams } from "next/navigation";
import useSWR from "swr";

export default function DashboardAccessPage() {
	const fetcher = async (url: string) => {
		const res = await fetch(url, {
			method: "GET",
			credentials: "include",
		});
		if (!res.ok) {
			throw new Error("Failed to fetch");
		}
		return res.json();
	};

	const { guildId } = useParams();

	const {
		data: roleOptions,
		error: roleError,
		isLoading: rolesLoading,
	} = useSWR<APIRoleSimplified[]>(
		`${process.env.BACKEND_API_URL || `http://localhost:4000`}/guilds/${guildId}/roles`,
		fetcher,
	);

	const {
		data: accessData,
		error: accessError,
		isLoading: accessLoading,
	} = useSWR<{ readAccess: string[]; editAccess: string[] }>(
		`${process.env.BACKEND_API_URL || `http://localhost:4000`}/guilds/${guildId}/settings/dashboard`,
		fetcher,
	);

	const [selectedEditRoles, setSelectedEditRoles] = useState<string[]>([]);
	const [selectedViewRoles, setSelectedViewRoles] = useState<string[]>([]);

	// When accessData loads, sync it into local state

	useEffect(() => {
		if (accessData && !accessLoading) {
			console.log(accessData);
			setSelectedEditRoles(accessData.editAccess || []);
			setSelectedViewRoles(accessData.readAccess || []);
			console.log("After: ", accessData.editAccess, accessData.readAccess);
		}
	}, [accessData]);

	return (
		<div className="w-full exl:max-w-[1800px] max-h-[60vh]">
			<section className="mt-10 flex flex-col gap-4">
				<h1 className="text-4xl ml-15 font-semibold leading-tight text-neutral-100">
					Dashboard Access
				</h1>

				<div className="bg-neutral-700/60 p-4 mx-10 rounded-lg flex flex-col gap-6 ">
					<section className="bg-alert-700 p-4 w-fit place-self-center items-center rounded-lg flex -mt-2 flex-row top-10 ">
						<FaTriangleExclamation className="size-6 shrink-0 mr-4 " />
						<span>
							Beware! Saved changes may be lost in future updates during the
							alpha period. We apologize for any inconvenience caused.
						</span>
					</section>

					<form className="grid xl:grid-cols-2 grid-cols-1 gap-4 ">
						<div className="xl:col-span-2 flex flex-col gap-2">
							<span className="text-normal ml-4 text-neutral-200 font-semibold">
								Control who can view and edit the dashboard based on their
								assigned roles in your server.
							</span>
							<span className="text-normal ml-4  text-neutral-300 font-medium">
								Users that are granted "Manage Server" permissions have access
								to all dashboard features automatically.
							</span>
						</div>
						<div className="flex-col flex gap-2 ml-10">
							{accessData && (
								<>
									{" "}
									<label className="text-lg font-medium text-neutral-200">
										Roles with Edit Access
									</label>
									<RoleMultiSelectMenu
										options={roleOptions || []}
										value={selectedEditRoles}
										onChange={setSelectedEditRoles}
										placeholder="No roles with edit access..."
										className="max-w-130"
									/>
								</>
							)}
						</div>
						<div className="flex-col flex gap-2 ml-10">
							{accessData && (
								<>
									<label className="text-lg font-medium text-neutral-200">
										Roles with View Access
									</label>
									<RoleMultiSelectMenu
										options={roleOptions || []}
										value={selectedViewRoles}
										onChange={setSelectedViewRoles}
										placeholder="No roles with view access..."
										className="max-w-130"
									/>
								</>
							)}
						</div>

						<div className="xl:col-span-2 mt-4 mb-2 mx-10 text-neutral-200">
							<p></p>
						</div>
					</form>
				</div>
				<button
					type="submit"
					onClick={async (e) => {
						e.preventDefault();

						const res = await fetch(
							`${process.env.BACKEND_API_URL || `http://localhost:4000`}/guilds/${guildId}/settings/dashboard`,
							{
								method: "PATCH",
								credentials: "include",
								headers: {
									"Content-Type": "application/json",
								},
								body: JSON.stringify({
									rolesWithDashboardViewAccess: [...selectedViewRoles],
									rolesWithDashboardEditAccess: [...selectedEditRoles],
								}),
							},
						);

						if (!res.ok) {
							// Replace with custom toaster alert
							alert("Failed to save changes.");
							return;
						}

						// TODO: display custom toaster alert
						alert("Changes saved successfully!");
					}}
					className="bg-info-700 text-neutral-200 font-semibold cursor-pointer py-2 rounded-md mx-10">
					Save Changes
				</button>
			</section>
		</div>
	);
}

interface APIRoleSimplified {
	name: string;
	id: string;
	color: number;
	position: number;
}
