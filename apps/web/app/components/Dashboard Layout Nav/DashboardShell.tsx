"use client";

import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { FaBars } from "react-icons/fa6";
import DashboardLayoutNav from "./Layout Nav";

/**
 * The frame of every /dashboard/[guildId] page: the sidebar plus the page.
 *
 * From lg up, the sidebar is docked on the left exactly as before. Below lg there's no room
 * for it next to the page, so it becomes a slide-out menu: hidden until the "Menu" button at
 * the top of the page is tapped, then shown over the page with a dimmed backdrop. It closes
 * when a page is picked (the path changes), the backdrop is tapped, or Escape is pressed.
 */
export default function DashboardShell({ children }: { children: ReactNode }) {
	const pathname = usePathname();
	const [menuOpen, setMenuOpen] = useState(false);

	// Close after navigating. Comparing with the path from the last render (during render) is
	// React's recommended alternative to resetting state in an effect.
	const [menuPathname, setMenuPathname] = useState(pathname);
	if (pathname !== menuPathname) {
		setMenuPathname(pathname);
		setMenuOpen(false);
	}

	useEffect(() => {
		if (!menuOpen) {
			return;
		}
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setMenuOpen(false);
			}
		};
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [menuOpen]);

	return (
		// overflow-x-clip (not overflow-hidden): still cuts off anything poking out sideways, but
		// lets an open dropdown near the bottom of a page extend downward instead of being clipped
		<div className="flex flex-row relative place-self-center w-full 2xl:max-w-[1800px] overflow-x-clip  ">
			<DashboardLayoutNav open={menuOpen} onClose={() => setMenuOpen(false)} />

			{/* Dims the page behind the open menu; tapping it closes the menu. Phones/tablets only. */}
			{menuOpen && (
				<div
					aria-hidden
					onClick={() => setMenuOpen(false)}
					className="fixed inset-0 z-30 bg-black/50 lg:hidden"
				/>
			)}

			<div className="w-full ">
				<div className="px-4 pt-4 lg:hidden">
					<button
						type="button"
						onClick={() => setMenuOpen(true)}
						aria-expanded={menuOpen}
						aria-controls="dashboard-menu"
						className="flex flex-row items-center gap-2 rounded-lg bg-neutral-700/60 px-4 py-2 font-semibold text-neutral-100 hover:bg-neutral-700 transition-colors cursor-pointer">
						<FaBars className="size-4" />
						Menu
					</button>
				</div>
				{children}
			</div>
		</div>
	);
}
