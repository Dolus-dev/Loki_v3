"use client";

import Image from "next/image";

import { useUser } from "../../lib/hooks/useUser";
import Link from "next/link";
import { IoChevronDown } from "react-icons/io5";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import ThemeToggler from "./ThemeToggler";

export default function RootLayoutHeader() {
	const { user } = useUser();
	const loginRef = `${process.env.BASE_API_URL ?? "http://localhost:4000"}/auth/login`;
	const logoutRef = `${process.env.BASE_API_URL ?? "http://localhost:4000"}/auth/logout`;
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

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
		<header className="bg-neutral-100 transition-colors duration-300 z-10 w-full sticky gap-2 items-center justify-center top-0 dark:bg-neutral-800 py-2 shadow-md flex flex-row ">
			<div className="flex flex-row items-center justify-between w-[75%] mx-auto py-2">
				<div className="  flex flex-row  gap-2 items-center ">
					<Image
						src="/logo.png"
						alt="Logo"
						width={1024}
						height={1024}
						className="size-16 -my-3 shrink-0"
					/>
					<span className="-mb-3">
						<h1 className="text-3xl ">LOKI</h1>
					</span>
					<div className="ml-4 scale-75">
						<ThemeToggler />
					</div>
				</div>

				{!user && (
					<Link
						className="bg-brand-900 font-semibold text-lg text-neutral-100 p-2 rounded-2xl hover:bg-brand-900/90 transition-colors hover:cursor-pointer"
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
									className="rounded-full size-12"
									loading="eager"
								/>
							) : (
								<div className="size-12 bg-gray-400 rounded-full" />
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
									<span className="text-neutral-950 font-semibold mt-2 ml-2 dark:text-neutral-50">
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
									<motion.a
										className="cursor-pointer  text-left pl-2 py-1 "
										href="https://discord.gg/ExAv9aGq8f"
										whileHover={{
											scale: 1.01,
											transition: { duration: 0.2 },
											backgroundColor: "var(--hover-bg)",
										}}
										transition={{ duration: 0.2 }}>
										Support Server
									</motion.a>
									<motion.button
										className="cursor-pointer  text-left pl-2 py-1 "
										whileHover={{
											scale: 1.01,
											transition: { duration: 0.2 },
											backgroundColor: "var(--hover-bg)",
										}}
										transition={{ duration: 0.2 }}>
										Logout
									</motion.button>
								</motion.div>
							)}
						</AnimatePresence>
					</div>
				)}
			</div>
		</header>
	);
}
