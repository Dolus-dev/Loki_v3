import Image from "next/image";
import { ReactNode } from "react";
import {
	FaBoxOpen,
	FaClipboardList,
	FaClockRotateLeft,
	FaEnvelopeOpenText,
	FaShieldHalved,
	FaSliders,
	FaUserLock,
} from "react-icons/fa6";
import HeroActions from "./components/Landing/HeroActions";

/**
 * The public landing page. Everything listed under "features" exists today; things still
 * being built go under "coming soon", so the page never promises what the bot can't do.
 */

const FEATURES: {
	icon: ReactNode;
	title: string;
	text: string;
	/** Spans the whole row, for the feature that closes the grid. */
	wide?: boolean;
}[] = [
	{
		icon: <FaShieldHalved />,
		title: "A complete moderation toolkit",
		text: "Warn, kick, ban, mute and time out members with slash commands, and lift bans, mutes and timeouts just as easily.",
	},
	{
		icon: <FaClockRotateLeft />,
		title: "Punishments that end on their own",
		text: 'Give bans, mutes and timeouts a length like "2 hours" or "1 week". Loki lifts them right on time, even after downtime.',
	},
	{
		icon: <FaEnvelopeOpenText />,
		title: "Members always know why",
		text: "Every action sends the member a clear DM with the reason and how long it lasts, without revealing which moderator acted.",
	},
	{
		icon: <FaSliders />,
		title: "Configured from the web",
		text: "Turn each action on or off, require a reason or evidence, and set default durations from an easy dashboard.",
	},
	{
		icon: <FaUserLock />,
		title: "Dashboard access by role",
		text: "Decide which roles can view or change your settings. Members with Manage Server always have full access.",
	},
	{
		icon: <FaClipboardList />,
		title: "A record of every action",
		text: "Each warning, kick, ban, mute and timeout is saved with its reason and evidence, backed by a full audit log.",
	},
	{
		icon: <FaBoxOpen />,
		title: "Fun for the whole community",
		text: "A great server is more than its rules. With /throw, members toss things at each other from Loki's built-in list or your own custom items, and a fumbled throw might just land on someone else. Set cooldowns and choose the channels it works in from the dashboard.",
		wide: true,
	},
];

const STEPS: { title: string; text: string }[] = [
	{
		title: "Add Loki to your server",
		text: "One click with the button above. Loki only asks for the permissions its features use.",
	},
	{
		title: "Set it up your way",
		text: "Log in to the dashboard to choose your rules, your mute role and who can manage Loki.",
	},
	{
		title: "Moderate with slash commands",
		text: "Type /warn, /mute, /ban and more. Loki handles the notices, the records and the timing.",
	},
];

const COMING_SOON = [
	"Server logging",
	"Starboard",
	"Ticket system",
	"Automod",
	"Custom notification messages",
];

/** The kind of DM Loki sends, shown as a preview in the hero (static, for illustration). */
function NoticePreview() {
	return (
		<div className="w-full max-w-md rounded-xl bg-neutral-800 p-4 shadow-2xl border border-neutral-700/60">
			<div className="flex flex-row items-center gap-3 mb-3">
				<Image
					src="/logo-512.png"
					alt=""
					width={64}
					height={64}
					className="size-10 rounded-full bg-neutral-900"
				/>
				<div className="flex flex-col">
					<span className="font-semibold text-neutral-100">
						Loki{" "}
						<span className="ml-1 rounded bg-info-600 px-1.5 py-0.5 text-xs font-bold text-white align-middle">
							APP
						</span>
					</span>
					<span className="text-xs text-neutral-400">Direct message</span>
				</div>
			</div>
			{/* Mirrors the bot's Components V2 notice: a container with a colored edge */}
			<div className="rounded-md border-l-4 border-yellow-400 bg-neutral-900/70 p-4 flex flex-col gap-1.5">
				<span className="text-lg font-bold text-neutral-100">
					You were timed out in Pixel Hangout
				</span>
				<span className="text-neutral-200">
					<span className="font-bold">Reason:</span> Spamming links in #general
				</span>
				<span className="text-neutral-200">
					<span className="font-bold">Duration:</span> 1 hour, until 4:30 PM (in
					1 hour)
				</span>
				<span className="mt-2 text-sm text-neutral-400">
					You can still read the server, but you can&apos;t send messages, react
					or join voice until it ends.
				</span>
			</div>
		</div>
	);
}

export default function Home() {
	return (
		<main className="mx-auto flex w-full max-w-6xl flex-col gap-24 px-6 pb-16">
			{/* Hero */}
			<section className="mt-16 grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
				<div className="flex flex-col gap-6">
					<div className="flex flex-row items-center gap-4">
						<Image
							src="/logo-512.png"
							alt="Loki logo"
							width={256}
							height={256}
							priority
							className="size-16 sm:size-24 shrink-0"
						/>
						<span className="text-5xl sm:text-7xl font-extrabold tracking-wider">LOKI</span>
					</div>
					<h1 className="text-3xl sm:text-4xl font-bold leading-tight text-neutral-100">
						Moderation that works the way{" "}
						<span className="text-brand-500">your server</span> does.
					</h1>
					<p className="text-xl text-neutral-300 max-w-xl">
						A multi-purpose Discord bot with a web dashboard. Fully customizable,
						and completely free.
					</p>
					<HeroActions />
				</div>
				<div className="flex justify-center lg:justify-end">
					<NoticePreview />
				</div>
			</section>

			{/* Features */}
			<section id="features" className="flex flex-col gap-10 scroll-mt-24">
				<div className="flex flex-col items-center gap-3 text-center">
					<h2 className="text-3xl sm:text-4xl font-bold text-neutral-100">
						Everything your community needs
					</h2>
					<p className="text-lg text-neutral-300 max-w-2xl">
						Built for servers that want clear rules, fair moderation, less
						busywork, and a bit of fun.
					</p>
				</div>
				<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
					{FEATURES.map((feature) => (
						<div
							key={feature.title}
							className={`flex gap-3 rounded-xl border p-6 transition-colors ${
								feature.wide
									? // The closing card: full width, icon beside the text, a touch of brand color
										"flex-col md:col-span-2 lg:col-span-3 lg:flex-row lg:items-center lg:gap-6 bg-brand-900/40 border-brand-800/60 hover:bg-brand-900/60"
									: "flex-col bg-neutral-700/40 border-neutral-700/60 hover:bg-neutral-700/60"
							}`}>
							<div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand-800/70 text-xl text-brand-400">
								{feature.icon}
							</div>
							<div className="flex flex-col gap-3">
								<h3 className="text-xl font-semibold text-neutral-100">
									{feature.title}
								</h3>
								<p className="text-neutral-300">{feature.text}</p>
							</div>
						</div>
					))}
				</div>
			</section>

			{/* How it works */}
			<section className="flex flex-col gap-10">
				<h2 className="text-center text-3xl sm:text-4xl font-bold text-neutral-100">
					Up and running in minutes
				</h2>
				<ol className="grid grid-cols-1 gap-6 md:grid-cols-3">
					{STEPS.map((step, index) => (
						<li
							key={step.title}
							className="flex flex-col gap-3 rounded-xl bg-neutral-800/60 p-6">
							<span className="flex size-10 items-center justify-center rounded-full bg-brand-700 text-lg font-bold text-neutral-100">
								{index + 1}
							</span>
							<h3 className="text-xl font-semibold text-neutral-100">
								{step.title}
							</h3>
							<p className="text-neutral-300">{step.text}</p>
						</li>
					))}
				</ol>
			</section>

			{/* Coming soon */}
			<section className="flex flex-col items-center gap-5 text-center">
				<h2 className="text-2xl font-bold text-neutral-100">
					Coming soon to Loki
				</h2>
				<ul className="flex flex-row flex-wrap justify-center gap-3">
					{COMING_SOON.map((item) => (
						<li
							key={item}
							className="rounded-full border border-neutral-600 px-4 py-1.5 text-neutral-300">
							{item}
						</li>
					))}
				</ul>
			</section>

			{/* Final call to action */}
			<section className="flex flex-col items-center gap-6 rounded-2xl bg-linear-to-br from-brand-900 to-neutral-800 px-6 py-12 text-center">
				<h2 className="text-3xl font-bold text-neutral-100">
					Ready to give your moderators a hand?
				</h2>
				<p className="text-lg text-neutral-300 max-w-xl">
					Loki is free while in alpha. Add it to your server and start shaping
					your rules today.
				</p>
				<HeroActions centered />
			</section>
		</main>
	);
}
