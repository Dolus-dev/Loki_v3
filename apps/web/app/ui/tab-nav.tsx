"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface TabNavItem {
	label: string;
	href: string;
}

interface TabNavProps {
	items: TabNavItem[];
	/** Accessible name for the tab bar, e.g. "Moderation settings". */
	label: string;
}

/**
 * A row of tabs where each tab is its own page (URL). The active tab is whichever one's
 * `href` matches the current path, or a page below it, so a tab stays highlighted on its
 * sub-pages too.
 *
 * Tabs are plain links, so they work with the keyboard, middle-click and Back/Forward. The
 * row never scrolls; on narrow screens the tabs wrap onto another line instead.
 */
export default function TabNav({ items, label }: TabNavProps) {
	const pathname = usePathname();

	const isActive = (href: string) =>
		pathname === href || pathname.startsWith(`${href}/`);

	return (
		<nav
			aria-label={label}
			className="flex flex-row flex-wrap gap-1 border-b border-neutral-600/60">
			{items.map((item) => {
				const active = isActive(item.href);
				return (
					<Link
						key={item.href}
						href={item.href}
						aria-current={active ? "page" : undefined}
						className={`-mb-px shrink-0 border-b-2 px-4 py-2 font-semibold transition-colors duration-200 ${
							active
								? "border-brand-600 text-neutral-100"
								: "border-transparent text-neutral-400 hover:border-neutral-400 hover:text-neutral-200"
						}`}>
						{item.label}
					</Link>
				);
			})}
		</nav>
	);
}
