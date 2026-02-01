"use client";
import { FaBoxOpen, FaKey } from "react-icons/fa";
import { useUser } from "../../../lib/hooks/useUser";
import Link from "next/link";
import { redirect, useParams } from "next/navigation";

export default function DashboardHome() {
	const { user } = useUser();

	if (!user) {
		return redirect("/");
	}

	const { guildId } = useParams();
	return (
		<div className="w-full 2xl:max-w-[1800px] place-self-center">
			<section className="mt-10 flex flex-col gap-4 ">
				<span className="text-4xl ml-6 font-semibold leading-tight text-neutral-100">
					Welcome <span className="text-brand-600">{user?.username}</span>,
				</span>
				<span className="whitespace-pre-wrap text-neutral-300 text-lg ml-6">
					The Dashboard is currently in Alpha development.
					<br />
					Below you can see the latest implemented features and updates.
				</span>
			</section>
			<section className="grid-cols-2  rounded-lg mt-4 p-6 gap-4 grid ">
				<div className="flex flex-col">
					<div className="flex flex-col bg-neutral-600/40 rounded-lg p-4 gap-2">
						<FaBoxOpen className="size-6 shrink-0 text-neutral-100" />
						<span className="text-xl font-semibold text-brand-600">
							Throw Command
						</span>
						<span className="text-neutral-200">
							Add custom items to the server's object list and manage them with
							ease.
							<br />
							Optionally restrict the list to custom items only.
						</span>
						<div className="mt-2 mb-1">
							<Link
								href={`/dashboard/${guildId}/fun/throw-command`}
								className="p-2 rounded-md font-semibold bg-neutral-600/50 w-full  text-neutral-200 hover:bg-neutral-600/70  transition duration-300">
								Configure command
							</Link>
						</div>
					</div>
				</div>
				<div className="flex flex-col">
					<div className="flex flex-col bg-neutral-600/40 rounded-lg p-4 gap-2">
						<FaKey className="size-5 shrink-0" />
						<span className="text-xl font-semibold  text-brand-600">
							Role Based Access Control
						</span>

						<span className="text-neutral-200">
							Manage who can access and edit the dashboard based on their
							assigned roles in your server.
							<br />
							Roles with the "Manage Server" permission will always be granted
							access.
						</span>
						<div className="mt-2 mb-1">
							<Link
								href={`/dashboard/${guildId}/core/dashboard-access-control`}
								className="p-2 rounded-md font-semibold bg-neutral-600/50 w-full text-neutral-200 hover:bg-neutral-600/70  transition duration-300">
								Manage Access
							</Link>
						</div>
					</div>
				</div>
			</section>
		</div>
	);
}
