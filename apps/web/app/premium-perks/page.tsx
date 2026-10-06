import type { Metadata } from "next";
import { ReactNode } from "react";
import {
	FaCheck,
	FaChartLine,
	FaGift,
	FaPalette,
	FaUnlock,
} from "react-icons/fa6";
import HeroActions from "../components/Landing/HeroActions";

export const metadata: Metadata = {
	title: "LOKI | Premium",
	description:
		"Every Loki feature is free. Premium only adds higher limits and branding Loki for your server.",
};

/**
 * The premium page. The promise it makes is the product's: no feature is ever locked behind
 * a paywall. Premium only raises limits and lets a server brand Loki as its own. Premium
 * isn't available yet, so no prices or exact limits are given here.
 */

const PREMIUM_PERKS: { icon: ReactNode; title: string; text: string }[] = [
	{
		icon: <FaChartLine />,
		title: "Higher limits",
		text: "More room for the things you build, like more custom items and bigger lists. Everything works the same, just with space to grow.",
	},
	{
		icon: <FaPalette />,
		title: "Your server's branding",
		text: "Make Loki look like part of your server: customize how it presents itself in your server so it matches your community's brand.",
	},
];

/** Free vs premium, row by row. `true` = included. */
const COMPARISON: { feature: string; free: string | true; premium: string | true }[] = [
	{ feature: "Every command and feature", free: true, premium: true },
	{ feature: "The web dashboard", free: true, premium: true },
	{ feature: "All future features", free: true, premium: true },
	{ feature: "Limits", free: "Standard", premium: "Higher" },
	{ feature: "Bot branding in your server", free: "Loki's look", premium: "Your server's look" },
];

function ComparisonCell({ value }: { value: string | true }) {
	if (value === true) {
		return (
			<span className="inline-flex items-center gap-2 text-brand-400">
				<FaCheck />
				<span className="sr-only">Included</span>
			</span>
		);
	}
	return <span className="text-neutral-300">{value}</span>;
}

export default function PremiumPerksPage() {
	return (
		<main className="mx-auto flex w-full max-w-5xl flex-col gap-20 px-6 py-16">
			{/* The promise */}
			<section className="flex flex-col items-center gap-6 text-center">
				<div className="flex size-20 items-center justify-center rounded-full bg-brand-800/70 text-4xl text-brand-400">
					<FaUnlock />
				</div>
				<h1 className="text-4xl sm:text-5xl font-extrabold text-neutral-100">
					Every feature. <span className="text-brand-500">Free.</span>
				</h1>
				<p className="max-w-3xl text-xl text-neutral-300">
					None of Loki&apos;s features will ever be locked behind a paywall.
					Moderation, fun commands, the dashboard and everything we add in the
					future are free for every server.
				</p>
			</section>

			{/* What premium adds */}
			<section className="flex flex-col gap-6">
				<div className="flex flex-col items-center gap-3 text-center">
					<h2 className="text-3xl font-bold text-neutral-100">
						So what does premium do?
					</h2>
					<p className="max-w-2xl text-lg text-neutral-300">
						Premium is for servers that want to go further. It only does two
						things:
					</p>
				</div>
				<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
					{PREMIUM_PERKS.map((perk) => (
						<div
							key={perk.title}
							className="flex flex-col gap-3 rounded-xl border border-brand-800/60 bg-brand-900/30 p-6">
							<span className="text-2xl text-brand-400">{perk.icon}</span>
							<h3 className="text-xl font-semibold text-neutral-100">
								{perk.title}
							</h3>
							<p className="text-neutral-300">{perk.text}</p>
						</div>
					))}
				</div>
			</section>

			{/* Free vs premium */}
			<section className="flex flex-col gap-6">
				<h2 className="text-center text-3xl font-bold text-neutral-100">
					Free vs premium
				</h2>
				<div className="overflow-hidden rounded-xl border border-neutral-700/60">
					<table className="w-full text-left text-sm sm:text-base">
						<thead className="bg-neutral-800">
							<tr>
								<th className="px-3 sm:px-5 py-3 font-semibold text-neutral-200">
									<span className="sr-only">Feature</span>
								</th>
								<th className="px-3 sm:px-5 py-3 font-semibold text-neutral-200">Free</th>
								<th className="px-3 sm:px-5 py-3 font-semibold text-brand-400">Premium</th>
							</tr>
						</thead>
						<tbody>
							{COMPARISON.map((row) => (
								<tr
									key={row.feature}
									className="border-t border-neutral-700/60 bg-neutral-800/40">
									<th
										scope="row"
										className="px-3 sm:px-5 py-3 font-medium text-neutral-100">
										{row.feature}
									</th>
									<td className="px-3 sm:px-5 py-3">
										<ComparisonCell value={row.free} />
									</td>
									<td className="px-3 sm:px-5 py-3">
										<ComparisonCell value={row.premium} />
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</section>

			{/* Availability */}
			<section className="flex flex-col items-center gap-6 rounded-2xl bg-linear-to-br from-brand-900 to-neutral-800 px-6 py-12 text-center">
				<span className="text-3xl text-brand-400">
					<FaGift />
				</span>
				<h2 className="text-3xl font-bold text-neutral-100">
					Premium isn&apos;t available yet
				</h2>
				<p className="max-w-xl text-lg text-neutral-300">
					While Loki is in alpha, there&apos;s nothing to pay for. Details will be
					announced closer to launch. In the meantime, everything Loki can do is
					yours to use.
				</p>
				<HeroActions centered />
			</section>
		</main>
	);
}
