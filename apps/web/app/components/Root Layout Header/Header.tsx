"use client";

import Image from "next/image";

import { useUser } from "../../lib/hooks/useUser";
import Link from "next/link";
import { IoChevronDown } from "react-icons/io5";
import { useEffect, useRef, useState } from "react";
import {
	AnimatePresence,
	AnimateSharedLayout,
	color,
	motion,
} from "motion/react";
import { usePathname } from "next/navigation";
import posthog from "posthog-js";
import { API_URL } from "../../lib/api";

const MotionLink = motion.create(Link);

export default function RootLayoutHeader() {
	const { user, isLoading } = useUser();
	const loginRef = `${API_URL}/auth/login`;
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const [logoutState, setLogoutState] = useState<"idle" | "pending" | "failed">(
		"idle",
	);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const navRef = useRef<HTMLElement>(null);
	const [activeNavItem, setActiveNavItem] = useState<string>("/");
	const [underlineLeft, setUnderlineLeft] = useState(0);
	const [underlineWidth, setUnderlineWidth] = useState(0);

	const pathname = usePathname();

	/**
	 * Ends the session on the backend, then reloads the site from the home page. A full page
	 * load (rather than router.push) also throws away everything cached in memory for this
	 * user, like their server list and settings, so none of it lingers after logout.
	 */
	const handleLogout = async () => {
		setLogoutState("pending");
		try {
			const res = await fetch(`${API_URL}/auth/logout`, {
				method: "POST",
				credentials: "include",
			});
			if (!res.ok) {
				throw new Error(`Logout failed with status ${res.status}`);
			}
		} catch (error) {
			console.error(error);
			setLogoutState("failed");
			return;
		}
		window.location.assign("/");
	};

	useEffect(() => {
		setActiveNavItem(pathname);

		const navItem = document.getElementById(activeNavItem);
		const itemRect = navItem?.getBoundingClientRect();

		setUnderlineWidth(itemRect?.width ?? 0);
		setUnderlineLeft(
			(itemRect?.x || 0) - (navRef.current?.getBoundingClientRect().x ?? 0)
		);
	}, [activeNavItem, pathname]);
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node)
			) {
				setIsDropdownOpen(false);
			}
		};

		if (isDropdownOpen) {
			document.addEventListener("click", handleClickOutside);
			return () => document.removeEventListener("click", handleClickOutside);
		}
	}, [isDropdownOpen]);

	return (
		<header className="  z-10 w-full sticky gap-2 items-center justify-center top-0 bg-neutral-800 py-2  flex flex-row ">
			<div className="flex flex-row items-center justify-between  2xl:max-w-[1800px] w-[95%] mx-auto py-2">
				<Link
					href={"/"}
					className="  flex flex-row  gap-2 items-center "
					onClick={() =>
						posthog.capture("button-clicked", {
							button_name: "Logo",
							location: "Header",
						})
					}>
					<Image
						src="/logo.png"
						alt="Logo"
						width={1024}
						height={1024}
						className="size-16 -my-3 shrink-0"
					/>
					{/* <span className="-mb-3">
						<h1 className="text-3xl ">LOKI</h1>
					</span> */}
				</Link>

				{!pathname.startsWith("/dashboard") && (
					<nav
						className="flex flex-row gap-6 relative text-lg font-medium"
						ref={navRef}>
						{/* A plain <nav>, deliberately without Framer's `layout`: in this sticky header
						    it measured the nav against the page, so after scrolling down and changing
						    pages (which scrolls back to the top) it animated the links up from mid-screen */}
						<MotionLink
							href="/"
							id="/"
							className={`text-(--text)relative hover:text-(--text-hover) transition-colors duration-200 p-1 }`}
							whileHover={{
								scale: 1.05,
								transition: { duration: 0.2 },
							}}
							transition={{ duration: 0.2 }}>
							Home
						</MotionLink>
						<MotionLink
							id="/about"
							href="/about"
							className={`text-(--text) hover:text-(--text-hover) transition-colors duration-200 p-1 `}
							whileHover={{
								scale: 1.05,
								transition: { duration: 0.2 },
							}}
							transition={{ duration: 0.2 }}>
							About
						</MotionLink>

						<MotionLink
							id="/status"
							href="/status"
							className={`text-(--text) hover:text-(--text-hover) transition-colors duration-200 p-1 	`}
							whileHover={{
								scale: 1.05,
								transition: { duration: 0.2 },
							}}
							transition={{ duration: 0.2 }}>
							Status
						</MotionLink>
						<MotionLink
							id="/docs"
							href="/docs"
							className={`text-(--text) hover:text-(--text-hover) transition-colors duration-200 p-1 `}
							whileHover={{
								scale: 1.05,
								transition: { duration: 0.2 },
							}}
							transition={{ duration: 0.2 }}>
							Docs
						</MotionLink>
						<MotionLink
							href="https://discord.gg/ExAv9aGq8f"
							className="text-(--text) hover:text-(--text-hover) transition-colors duration-200 p-1"
							whileHover={{
								scale: 1.05,
								transition: { duration: 0.2 },
							}}
							transition={{ duration: 0.2 }}>
							Support
						</MotionLink>
						<MotionLink
							id="/premium-perks"
							href="/premium-perks"
							className="text-brand-600  p-1 transition-colors duration-200 "
							whileHover={{
								scale: 1.025,
								transition: { duration: 0.2 },
							}}
							transition={{ duration: 0.2 }}>
							Premium
						</MotionLink>
						<motion.div
							className=" h-1 rounded-lg absolute -bottom-2 bg-brand-700"
							transition={{
								type: "spring",
								stiffness: 400,
								damping: 30,
								duration: 0.3,
							}}
							initial={false}
							animate={{ width: underlineWidth, translateX: underlineLeft }}
						/>
						{/* <motion.div
								layout
								className={`absolute bottom-0 bg-brand-700 rounded-full h-0.5 left-0 w-20`}
								initial={false}
								animate={{ left: underlineLeft, width: underlineWidth }}
								transition={{ type: "spring", stiffness: 400, damping: 30 }}
							/> */}
					</nav>
				)}

				{isLoading && <p>Loading...</p>}

				{!user && !isLoading && (
					<Link
						className="bg-brand-800 font-semibold text-lg text-neutral-100 p-2 rounded-2xl hover:bg-brand-800/90 dark:hover:bg-brand-800/90 transition-colors hover:cursor-pointer"
						href={loginRef}>
						Log into Discord
					</Link>
				)}
				{user && (
					<div
						className="relative"
						ref={dropdownRef}>
						<button
							className="flex flex-row items-center gap-2 hover:cursor-pointer"
							onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
							{user.avatarHash ? (
								<Image
									src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatarHash}.png`}
									alt={`${user.username}'s avatar`}
									width={128}
									height={128}
									className="rounded-full size-10"
									loading="eager"
								/>
							) : (
								<div className="size-10 bg-gray-400 rounded-full" />
							)}
							<p className="text-lg font-medium">{user.username}</p>
							<motion.div
								animate={{ rotate: isDropdownOpen ? 180 : 0 }}
								transition={{ duration: 0.2 }}>
								<IoChevronDown
									size={20}
									className=""
								/>
							</motion.div>
						</button>

						<AnimatePresence>
							{isDropdownOpen && (
								<motion.div
									initial={{ opacity: 0, y: -10 }}
									animate={{ opacity: 1, scale: 1, y: 0 }}
									exit={{ opacity: 0, y: -10 }}
									transition={{ duration: 0.2 }}
									className="absolute top-full z-0 right-0 mt-2 border border-neutral-600/20 bg-neutral-100/30 backdrop-blur-md rounded-md  shadow-lg w-48 flex flex-col overflow-hidden">
									<span className=" font-semibold mt-2 ml-2 text-neutral-50">
										LOKI
									</span>
									<motion.a
										className="cursor-pointer  text-left pl-2 py-1 "
										href="/dashboard"
										whileHover={{
											scale: 1.01,
											transition: { duration: 0.2 },

											backgroundColor: "var(--hover-bg)",
										}}
										transition={{ duration: 0.2 }}>
										My Servers
									</motion.a>
									<motion.a
										className="cursor-pointer  text-left pl-2 py-1 "
										href="/updates"
										whileHover={{
											scale: 1.01,
											transition: { duration: 0.2 },
											backgroundColor: "var(--hover-bg)",
										}}
										transition={{ duration: 0.2 }}>
										Changelogs
									</motion.a>
									<motion.button
										type="button"
										onClick={handleLogout}
										disabled={logoutState === "pending"}
										className="cursor-pointer  text-left pl-2 py-1 disabled:cursor-wait disabled:opacity-60"
										whileHover={{
											scale: 1.01,
											transition: { duration: 0.2 },
											backgroundColor: "var(--hover-bg)",
										}}
										transition={{ duration: 0.2 }}>
										{logoutState === "pending" ? "Logging out..." : "Logout"}
									</motion.button>
									{logoutState === "failed" && (
										<span
											role="alert"
											className="pl-2 pb-2 text-sm text-danger-400">
											Couldn&apos;t log out. Try again.
										</span>
									)}
								</motion.div>
							)}
						</AnimatePresence>
					</div>
				)}
			</div>
		</header>
	);
}
