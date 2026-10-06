import type { Metadata } from "next";
import Image from "next/image";
import { ReactNode } from "react";
import {
	FaArrowRightArrowLeft,
	FaCheck,
	FaClockRotateLeft,
	FaDatabase,
	FaDiscord,
	FaFaceLaughBeam,
	FaGaugeHigh,
	FaGavel,
	FaKey,
	FaLaptopCode,
	FaListCheck,
	FaRobot,
	FaServer,
	FaSliders,
	FaUserShield,
} from "react-icons/fa6";
import HeroActions from "../components/Landing/HeroActions";

export const metadata: Metadata = {
	title: "LOKI | About",
	description:
		"What Loki is, how it's built, and where it's headed: a free Discord moderation and community bot with a web dashboard.",
};

/**
 * The About page: Loki's story, what's in the alpha, how it's built and what's next.
 * Keep it factual: anything listed as available must exist in the bot or dashboard today.
 */

/** Who Loki is for, and what each group gets out of it. */
const AUDIENCES: { icon: ReactNode; title: string; text: string }[] = [
	{
		icon: <FaGavel />,
		title: "Moderators",
		text: "Tools they can trust: clear commands, timed actions that end on their own, and a record of every decision.",
	},
	{
		icon: <FaSliders />,
		title: "Server owners",
		text: "Control without memorizing commands. Every setting lives in a web dashboard, and access follows your roles.",
	},
	{
		icon: <FaFaceLaughBeam />,
		title: "Members",
		text: "Something fun to do together, and clear, respectful messages when a moderator steps in.",
	},
];

const ALPHA_FEATURES = [
	"Warn, kick, ban, mute and timeout commands, plus unban, unmute and remove-timeout",
	"Timed bans, mutes and timeouts that Loki lifts automatically",
	"DM notices that tell members what happened and why",
	"A /throw command for members to have fun with",
	"A web dashboard to configure every command per server",
	"Dashboard access controlled by server roles",
];

const ROADMAP = [
	"Server logging, with a moderation log channel",
	"An evidence locker channel for moderation evidence",
	"Custom notification messages per server",
	"Starboard",
	"Ticket system",
	"Automod",
	"Urban Dictionary lookups",
	"Public beta release",
];

const STACK: { area: string; icon: ReactNode; items: string[] }[] = [
	{
		area: "Discord bot",
		icon: <FaRobot />,
		items: ["TypeScript", "discord.js", "Custom command framework"],
	},
	{
		area: "Backend API",
		icon: <FaServer />,
		items: ["Express", "TypeORM", "PostgreSQL", "Redis", "Zod"],
	},
	{
		area: "Web dashboard",
		icon: <FaLaptopCode />,
		items: ["Next.js", "React", "Tailwind CSS", "SWR"],
	},
	{
		area: "Tooling",
		icon: <FaListCheck />,
		items: ["Turborepo", "pnpm workspaces"],
	},
];

const HIGHLIGHTS: { icon: ReactNode; title: string; text: string }[] = [
	{
		icon: <FaArrowRightArrowLeft />,
		title: "One API for bot and dashboard",
		text: "The bot never talks to the database directly. Both it and the dashboard go through the same backend, so data is validated, cached and secured in one place.",
	},
	{
		icon: <FaUserShield />,
		title: "Access checked on every request",
		text: "Dashboard access follows your server's own roles, and the API enforces it on every request. The dashboard simply reflects what the API allows.",
	},
	{
		icon: <FaClockRotateLeft />,
		title: "Reliable timed actions",
		text: "Expiring bans, mutes and timeouts are tracked by the backend and lifted by the bot within a minute, even if it was offline when they ran out.",
	},
	{
		icon: <FaDatabase />,
		title: "A full audit trail",
		text: "Every moderation action, and every change to one, is recorded together with who did it and why.",
	},
	{
		icon: <FaKey />,
		title: "Secure by default",
		text: "Logins go through Discord, stored Discord tokens are encrypted at rest, and the bot only asks for the permissions its features use.",
	},
	{
		icon: <FaGaugeHigh />,
		title: "Fast where it matters",
		text: "Frequently used data, like server roles and channels, is cached in Redis to keep the dashboard quick and stay within Discord's rate limits.",
	},
];

/** A box in the architecture diagram. */
function DiagramBox({
	icon,
	title,
	subtitle,
}: {
	icon: ReactNode;
	title: string;
	subtitle: string;
}) {
	return (
		<div className="flex min-w-40 flex-col items-center gap-1 rounded-xl border border-neutral-600 bg-neutral-800 px-5 py-4 text-center">
			<span className="text-2xl text-brand-400">{icon}</span>
			<span className="font-semibold text-neutral-100">{title}</span>
			<span className="text-sm text-neutral-400">{subtitle}</span>
		</div>
	);
}

/** A connector between diagram boxes: horizontal on wide screens, vertical when stacked. */
function DiagramArrow() {
	return (
		<span
			aria-hidden
			className="text-xl text-neutral-500 rotate-90 lg:rotate-0">
			<FaArrowRightArrowLeft />
		</span>
	);
}

export default function AboutPage() {
	return (
		<main className="mx-auto flex w-full max-w-5xl flex-col gap-20 px-6 py-16">
			{/* Intro */}
			<section className="flex flex-col items-center gap-6 text-center">
				<Image
					src="/logo-512.png"
					alt="Loki logo"
					width={256}
					height={256}
					priority
					className="size-24"
				/>
				<h1 className="text-4xl sm:text-5xl font-extrabold tracking-wide text-neutral-100">
					About Loki
				</h1>
				<p className="max-w-3xl text-xl text-neutral-300">
					Loki is a free Discord bot for community servers. It brings moderation
					and fun together, and puts every setting in a web dashboard instead of
					a wall of commands.
				</p>
			</section>

			{/* Why Loki */}
			<section className="flex flex-col gap-6">
				<h2 className="text-3xl font-bold text-neutral-100">Why Loki</h2>
				<p className="text-lg text-neutral-300">
					A community server works best when everyone in it is looked after. Loki
					is built around the three groups that make a server what it is.
				</p>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
					{AUDIENCES.map((audience) => (
						<div
							key={audience.title}
							className="flex flex-col gap-2 rounded-xl bg-neutral-800/60 p-5">
							<span className="text-2xl text-brand-400">{audience.icon}</span>
							<h3 className="text-lg font-semibold text-neutral-100">
								{audience.title}
							</h3>
							<p className="text-neutral-300">{audience.text}</p>
						</div>
					))}
				</div>
			</section>

			{/* What's in the alpha */}
			<section className="flex flex-col gap-6">
				<div className="flex flex-row flex-wrap items-center gap-3">
					<h2 className="text-3xl font-bold text-neutral-100">
						What&apos;s in the alpha
					</h2>
					<span className="rounded-full bg-alert-700 px-3 py-1 text-sm font-semibold text-neutral-100">
						Alpha
					</span>
				</div>
				<ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
					{ALPHA_FEATURES.map((feature) => (
						<li
							key={feature}
							className="flex flex-row items-start gap-3 rounded-lg bg-neutral-800/60 p-4 text-neutral-200">
							<FaCheck className="mt-1 shrink-0 text-brand-500" />
							{feature}
						</li>
					))}
				</ul>
			</section>

			{/* Architecture */}
			<section className="flex flex-col gap-6">
				<h2 className="text-3xl font-bold text-neutral-100">How it&apos;s built</h2>
				<p className="text-lg text-neutral-300">
					Loki is a TypeScript monorepo with three apps. The bot and the
					dashboard are both clients of the same backend API, which owns the
					data.
				</p>
				<div className="flex flex-col items-center gap-4 rounded-2xl bg-neutral-700/30 p-6 lg:flex-row lg:justify-center">
					<DiagramBox
						icon={<FaDiscord />}
						title="Discord bot"
						subtitle="Slash commands & events"
					/>
					<DiagramArrow />
					<div className="flex flex-col items-center gap-3">
						<DiagramBox
							icon={<FaServer />}
							title="Backend API"
							subtitle="Rules, access & data"
						/>
						<div className="flex flex-row gap-3">
							<span className="rounded-md bg-neutral-800 px-3 py-1 text-sm text-neutral-300">
								PostgreSQL
							</span>
							<span className="rounded-md bg-neutral-800 px-3 py-1 text-sm text-neutral-300">
								Redis cache
							</span>
						</div>
					</div>
					<DiagramArrow />
					<DiagramBox
						icon={<FaLaptopCode />}
						title="Web dashboard"
						subtitle="Settings & access"
					/>
				</div>

				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					{STACK.map((group) => (
						<div
							key={group.area}
							className="flex flex-col gap-3 rounded-xl bg-neutral-800/60 p-5">
							<span className="flex flex-row items-center gap-2 font-semibold text-neutral-100">
								<span className="text-brand-400">{group.icon}</span>
								{group.area}
							</span>
							<div className="flex flex-row flex-wrap gap-2">
								{group.items.map((item) => (
									<span
										key={item}
										className="rounded-full border border-neutral-600 px-3 py-1 text-sm text-neutral-300">
										{item}
									</span>
								))}
							</div>
						</div>
					))}
				</div>
			</section>

			{/* Engineering highlights */}
			<section className="flex flex-col gap-6">
				<h2 className="text-3xl font-bold text-neutral-100">Under the hood</h2>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
					{HIGHLIGHTS.map((highlight) => (
						<div
							key={highlight.title}
							className="flex flex-col gap-2 rounded-xl border border-neutral-700/60 bg-neutral-700/30 p-5">
							<span className="text-xl text-brand-400">{highlight.icon}</span>
							<h3 className="text-lg font-semibold text-neutral-100">
								{highlight.title}
							</h3>
							<p className="text-neutral-300">{highlight.text}</p>
						</div>
					))}
				</div>
			</section>

			{/* Roadmap */}
			<section className="flex flex-col gap-6">
				<h2 className="text-3xl font-bold text-neutral-100">What&apos;s next</h2>
				<ul className="flex flex-row flex-wrap gap-3">
					{ROADMAP.map((item) => (
						<li
							key={item}
							className="rounded-full border border-neutral-600 px-4 py-1.5 text-neutral-300">
							{item}
						</li>
					))}
				</ul>
			</section>

			{/* Call to action */}
			<section className="flex flex-col items-center gap-6 rounded-2xl bg-linear-to-br from-brand-900 to-neutral-800 px-6 py-12 text-center">
				<h2 className="text-3xl font-bold text-neutral-100">Try Loki today</h2>
				<p className="max-w-xl text-lg text-neutral-300">
					Loki is free while in alpha. Add it to your server and shape it to fit
					your community.
				</p>
				<HeroActions centered />
			</section>
		</main>
	);
}
