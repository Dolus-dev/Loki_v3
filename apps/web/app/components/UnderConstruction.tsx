import { ReactNode } from "react";
import { FaDiscord, FaHelmetSafety } from "react-icons/fa6";

// The support server, the same one linked in the header
export const SUPPORT_SERVER_URL = "https://discord.gg/ExAv9aGq8f";

export interface PlannedItem {
	icon: ReactNode;
	name: string;
	description: string;
}

interface UnderConstructionProps {
	/** e.g. "Status page under construction" */
	title: string;
	/** What's being built, ending with something like "Here's what it will cover:". */
	description: ReactNode;
	/** What the finished page will contain, each tagged "Coming soon". */
	planned: PlannedItem[];
	/** The line above the support server button. */
	supportText?: string;
}

/**
 * A placeholder page for a section that isn't built yet: a hard-hat icon, what's coming,
 * and a link to the support server in the meantime. Every planned item is tagged
 * "Coming soon", so the page never claims something exists (or is up or down) when it doesn't.
 */
export default function UnderConstruction(props: UnderConstructionProps) {
	const {
		title,
		description,
		planned,
		supportText = "Until then, announcements and help are in our Discord server.",
	} = props;

	return (
		<main className="mx-auto flex w-full max-w-3xl flex-col items-center gap-10 px-6 py-20 text-center">
			<div className="flex size-24 items-center justify-center rounded-full bg-alert-700/60 text-5xl text-alert-300">
				<FaHelmetSafety />
			</div>

			<div className="flex flex-col gap-4">
				<h1 className="text-4xl sm:text-5xl font-extrabold text-neutral-100">{title}</h1>
				<p className="text-lg text-neutral-300">{description}</p>
			</div>

			<ul className="flex w-full flex-col gap-3 text-left">
				{planned.map((item) => (
					<li
						key={item.name}
						className="flex flex-row items-center gap-4 rounded-xl border border-neutral-700/60 bg-neutral-800/60 p-4">
						<span className="text-2xl text-brand-400">{item.icon}</span>
						<div className="flex flex-1 flex-col">
							<span className="font-semibold text-neutral-100">{item.name}</span>
							<span className="text-sm text-neutral-400">{item.description}</span>
						</div>
						<span className="rounded-full border border-neutral-600 px-3 py-1 text-sm text-neutral-400">
							Coming soon
						</span>
					</li>
				))}
			</ul>

			<div className="flex flex-col items-center gap-4">
				<p className="text-neutral-300">{supportText}</p>
				<a
					href={SUPPORT_SERVER_URL}
					target="_blank"
					rel="noopener noreferrer"
					className="flex flex-row items-center gap-2 rounded-3xl bg-info-700 px-5 py-2.5 text-lg font-bold text-neutral-100 transition-colors hover:bg-info-600">
					<FaDiscord className="size-5" />
					Join the support server
				</a>
			</div>
		</main>
	);
}
