"use client";

import { FaTriangleExclamation } from "react-icons/fa6";
import { useState } from "react";
import MultiSelectMenu from "../../../../ui/multi-select-menu";
import NumberInput from "../../../../ui/number-input";
import Toggle from "../../../../ui/toggle";
import useSWR from "swr";
import { ChannelType } from "discord-api-types/v10";
import { useParams } from "next/navigation";
import ChannelMultiSelectMenu from "../../../../ui/channel-multi-select-menu";
import RoleMultiSelectMenu from "../../../../ui/role-multi-select-menu";
import { API_URL, fetcher } from "../../../../lib/api";

export default function ThrowCommandPage() {
	const [customItemsEnabled, setCustomItemsEnabled] = useState(false);
	const [disableDefaultItems, setDisableDefaultItems] = useState(false);
	const [redirectEnabled, setRedirectEnabled] = useState(false);
	const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
	const [cooldownSeconds, setCooldownSeconds] = useState<number>(10);
	const [selectedChannelWhitelist, setSelectedChannelWhitelist] = useState<
		string[]
	>([]);
	const [selectedChannelBlacklist, setSelectedChannelBlacklist] = useState<
		string[]
	>([]);

	const { guildId } = useParams();

	const {
		data: roleOptions,
		error: roleError,
		isLoading: rolesLoading,
	} = useSWR<APIRoleSimplified[]>(
		`${API_URL}/guilds/${guildId}/roles`,
		fetcher
	);
	const {
		data: channelOptions,
		error: channelError,
		isLoading: channelIsLoading,
	} = useSWR<ReturnedChannelGroup[]>(
		`${API_URL}/guilds/${guildId}/channels`,
		fetcher
	);

	return (
		<div className="w-full 2xl:max-w-[1800px] max-h-[60vh] ">
			<section className="mt-10 flex flex-col  gap-4 ">
				<h1 className="text-4xl ml-15 font-semibold leading-tight text-neutral-100">
					Throw Settings
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
						<div className="xl:col-span-2">
							<span className="text-normal ml-4 text-neutral-200 font-semibold">
								A fun command that allows users to throw items between
								themselves.
							</span>
						</div>
						<div className="flex flex-col gap-2 ml-10">
							<div className="flex flex-col gap-6  mt-5">
								<Toggle
									checked={customItemsEnabled}
									onChange={setCustomItemsEnabled}
									label="Enable Custom Items"
								/>
								<Toggle
									checked={disableDefaultItems}
									onChange={setDisableDefaultItems}
									label="Disable Default Items"
								/>
								<div className="text-neutral-300 text-sm max-w-130  -mt-3 -mb-2">
									<p>
										Disabling default items will prevent users from throwing the
										built-in items. The toggle will have no effect if custom
										items have been disabled or the list is less than 20 items.
									</p>
								</div>
							</div>

							<div className="flex flex-row xl:flex-col mt-5 gap-2  ">
								<label
									htmlFor="cooldown-seconds"
									className="text-neutral-200 font-semibold">
									Cooldown (Seconds)
								</label>
								<p className="text-sm text-neutral-300">
									Value of 0 disables the cooldown.
								</p>
							</div>
							<NumberInput
								value={cooldownSeconds}
								onChange={setCooldownSeconds}
								min={0}
								step={1}
								className="max-w-20"
							/>

							<Toggle
								checked={redirectEnabled}
								onChange={setRedirectEnabled}
								label="Enable Redirect Chance on Fail"
								className="mt-5"
							/>
							<div className="text-neutral-300 text-sm max-w-130  ">
								<p>
									When enabled, there is a chance that when a user "fails"
									throwing an object, it will be redirected to another random
									user in the server.
								</p>
							</div>

							<label className="text-neutral-200 mt-4 mb-1 font-semibold ">
								Redirect Opt-in Roles:
							</label>
							<RoleMultiSelectMenu
								options={roleOptions || []}
								value={selectedRoles}
								onChange={setSelectedRoles}
								placeholder="No Roles Selected..."
								className="max-w-130"
							/>

							<p className="text-sm max-w-130 text-neutral-300">
								Users without any of the listed roles will not be considered for
								receiving redirected throws.
							</p>
						</div>

						<div className="">
							<label
								htmlFor="custom-items"
								className="text-neutral-200 font-semibold ">
								Custom Items (comma separated):
								<textarea
									id="custom-items"
									defaultValue={undefined}
									className="w-full mt-2 p-2 rounded-md bg-neutral-800 resize-y min-h-[10vh] max-h-[30vh] text-neutral-200"
									disabled={!customItemsEnabled}></textarea>
							</label>

							<div className="flex flex-col gap-5 mt-5">
								<div className="flex flex-col w-full">
									<label>Channel Whitelist:</label>
									<ChannelMultiSelectMenu
										options={channelOptions!}
										value={selectedChannelWhitelist}
										onChange={setSelectedChannelWhitelist}
										placeholder="No Channels Selected..."
										className=""
									/>
								</div>

								<p className="text-sm  text-neutral-300 -mt-2">
									The whitelist takes precedence over the blacklist. If both are
									empty, the command will be usable in all channels.
								</p>
								<div className="flex flex-col w-full">
									<label>Channel Blacklist:</label>
									<ChannelMultiSelectMenu
										options={channelOptions!}
										value={selectedChannelBlacklist}
										onChange={setSelectedChannelBlacklist}
										placeholder="No Channels Selected..."
										className=""
									/>
								</div>
							</div>
						</div>
					</form>
				</div>
				<button
					type="submit"
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

interface ReturnedChannel {
	id: string;
	name: string;
	type?: ChannelType;
}

interface ReturnedChannelGroup {
	category: string;
	children: ReturnedChannel[];
}
