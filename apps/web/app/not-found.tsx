import Image from "next/image";
import Link from "next/link";
import { FaHouse, FaServer } from "react-icons/fa6";

export const metadata = {
	title: "LOKI | Page not found",
};

/**
 * Shown for any URL that doesn't match a page (Next.js renders this for every unknown route,
 * and for pages that call `notFound()`). It sits inside the root layout, so the header and
 * footer stay.
 */
export default function NotFound() {
	return (
		<main className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 px-6 py-24 text-center">
			<Image
				src="/logo.png"
				alt=""
				width={128}
				height={128}
				className="size-24 opacity-80"
			/>
			<span className="text-7xl sm:text-8xl font-extrabold tracking-wider text-brand-500">
				404
			</span>
			<h1 className="text-3xl font-bold text-neutral-100">
				This page doesn&apos;t exist
			</h1>
			<p className="text-lg text-neutral-300">
				The link may be broken, or the page may have moved. Even Loki can&apos;t
				find it.
			</p>
			<div className="mt-2 flex flex-row flex-wrap justify-center gap-4">
				<Link
					href="/"
					className="flex flex-row items-center gap-2 rounded-3xl bg-brand-700 px-5 py-2.5 text-lg font-bold text-neutral-100 transition-colors hover:bg-brand-600">
					<FaHouse className="size-4" />
					Back to home
				</Link>
				<Link
					href="/dashboard"
					className="flex flex-row items-center gap-2 rounded-3xl bg-neutral-800 px-5 py-2.5 text-lg font-bold text-neutral-100 transition-colors hover:bg-neutral-700">
					<FaServer className="size-4" />
					Your servers
				</Link>
			</div>
		</main>
	);
}
