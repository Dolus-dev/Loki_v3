"use client";
import { ChevronDownIcon } from "@heroicons/react/24/solid";
import { AnimatePresence, motion } from "motion/react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
	FaDatabase,
	FaLaptopCode,
	FaShieldAlt,
	FaTags,
	FaToolbox,
	FaQuestion,
	FaCode,
	FaHammer,
	FaRobot,
	FaIdCard,
	FaTwitch,
	FaRss,
	FaYoutube,
	FaCamera,
	FaCameraRetro,
	FaVideo,
	FaReddit,
	FaObjectGroup,
	FaBoxOpen,
	FaStarHalf,
	FaStar,
	FaMicrophone,
	FaUserPlus,
	FaTrophy,
} from "react-icons/fa";
import {
	FaHouse,
	FaArrowRotateRight,
	FaGears,
	FaGear,
	FaBots,
	FaBellConcierge,
	FaTicket,
} from "react-icons/fa6";
import { IoHappy } from "react-icons/io5";
import { MdOutlineRssFeed } from "react-icons/md";

export default function DashboardLayoutNav() {
	const [isCoreOpen, setIsCoreOpen] = useState(false);
	const [isCustomOpen, setIsCustomOpen] = useState(false);
	const [isModerationOpen, setIsModerationOpen] = useState(false);
	const [isFeedsOpen, setIsFeedsOpen] = useState(false);
	const [isRolesOpen, setIsRolesOpen] = useState(false);
	const [isToolsOpen, setIsToolsOpen] = useState(false);
	const [isFunOpen, setIsFunOpen] = useState(false);

	const pathname = usePathname();

	console.log(pathname.endsWith("/home"));
	return (
		<motion.nav
			layout
			layoutScroll
			transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
			className="flex flex-col bg-neutral-800/90 w-75  left-0 h-screen overflow-y-auto top-18 fixed  text-neutral-200 text-sm text-nowrap">
			{/* Navigation items here */}

			<div className="flex flex-row gap-4 mb-4 mt-4 justify-center text-sm font-semibold">
				<div className="flex flex-row gap-2 px-4 py-1 items-center bg-neutral-600/50 rounded-2xl border-neutral-200/50 border">
					<FaHouse className="size-5 shrink-0 " />
					<span className="mt-1">Home</span>
				</div>
				<div className="p-2 bg-neutral-600/50 rounded-2xl border-neutral-200/30 border cursor-pointer hover:bg-neutral-600/70 transition-colors">
					<FaArrowRotateRight className="size-4 shrink-0   " />
				</div>
			</div>

			<motion.button
				className="flex flex-row gap-4 cursor-pointer items-center relative px-4 py-2 hover:bg-neutral-600/30 transition duration-300"
				onClick={() => {
					setIsCoreOpen(!isCoreOpen);
					setIsCustomOpen(false);
					setIsModerationOpen(false);
					setIsFeedsOpen(false);
					setIsRolesOpen(false);
					setIsToolsOpen(false);
					setIsFunOpen(false);
				}}>
				<FaGears className="size-5 shrink-0 " />
				<span className="mt-1">Core</span>
				<motion.div
					className="mt-1 ml-auto "
					initial={{ rotate: 0 }}
					animate={{ rotate: isCoreOpen ? 180 : 0 }}
					transition={{ duration: 0.3 }}>
					<ChevronDownIcon className="size-5 shrink-0 " />
				</motion.div>
			</motion.button>
			<AnimatePresence mode="sync">
				{isCoreOpen && (
					<motion.div
						key={"core-list"}
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: "auto", opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.3, ease: "easeInOut" }}
						className="flex-col flex  overflow-hidden text-sm"
						style={{ willChange: "height, opacity", transformOrigin: "top" }}
						aria-expanded={isCoreOpen}>
						<div className="flex flex-col  bg-neutral-900/30">
							<div className="flex flex-row gap-4 py-2 items-center cursor-pointer hover:bg-neutral-600/30 transition duration-300">
								<FaGear className="size-5 shrink-0 ml-9 pb-0.5" />
								<span>Dashboard Access</span>
							</div>
							<div className="flex flex-row gap-4 py-2 items-center cursor-not-allowed hover:bg-neutral-600/30 transition duration-300">
								<FaDatabase className="size-5 shrink-0 ml-9 pb-0.5" />
								<span>Dashboard Logs</span>
							</div>
						</div>
					</motion.div>
				)}

				<motion.button
					onClick={() => {
						setIsCustomOpen(!isCustomOpen);
						setIsCoreOpen(false);
						setIsModerationOpen(false);
						setIsFeedsOpen(false);
						setIsRolesOpen(false);
						setIsToolsOpen(false);
						setIsFunOpen(false);
					}}
					layout
					key="custom-command-parent"
					className="flex flex-row gap-4 px-4 py-2 relative  items-center hover:bg-neutral-600/30 transition duration-300">
					<FaLaptopCode className="size-5 shrink-0 " />
					<span className="">Custom Commands</span>
					<motion.div
						className="mt-1 ml-auto "
						initial={{ rotate: 0 }}
						animate={{ rotate: isCustomOpen ? 180 : 0 }}
						transition={{ duration: 0.3 }}>
						<ChevronDownIcon className="size-5 shrink-0 " />
					</motion.div>
				</motion.button>

				{isCustomOpen && (
					<motion.div
						key={"custom-list"}
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: "auto", opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.3, ease: "easeInOut" }}
						className="flex-col flex  overflow-hidden text-sm"
						style={{ willChange: "height, opacity", transformOrigin: "top" }}
						aria-expanded={isCustomOpen}>
						<div className="flex flex-col  bg-neutral-900/30">
							<div className="flex flex-row gap-4 py-2 items-center cursor-not-allowed  hover:bg-neutral-600/30 transition duration-300">
								<FaCode className="size-5 shrink-0 ml-9 pb-0.5" />
								<span>Commands</span>
							</div>
							<div className="flex flex-row gap-4 py-2 items-center cursor-not-allowed hover:bg-neutral-600/30 transition duration-300">
								<FaDatabase className="size-5 shrink-0 ml-9 pb-0.5" />
								<span>Database</span>
							</div>
						</div>
					</motion.div>
				)}

				<motion.button
					onClick={() => {
						setIsModerationOpen(!isModerationOpen);
						setIsCoreOpen(false);
						setIsCustomOpen(false);
						setIsFeedsOpen(false);
						setIsRolesOpen(false);
						setIsToolsOpen(false);
						setIsFunOpen(false);
					}}
					layout
					key="Moderation Parent"
					className="flex flex-row gap-4 px-4 py-2 relative cursor-pointer  items-center hover:bg-neutral-600/30 transition duration-300">
					<FaShieldAlt className="size-5 shrink-0 " />
					<span>Moderation</span>
					<motion.div
						className="mt-1 ml-auto "
						initial={{ rotate: 0 }}
						animate={{ rotate: isModerationOpen ? 180 : 0 }}
						transition={{ duration: 0.3 }}>
						<ChevronDownIcon className="size-5 shrink-0 " />
					</motion.div>
				</motion.button>

				{isModerationOpen && (
					<motion.div
						key={"moderation-list"}
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: "auto", opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.3, ease: "easeInOut" }}
						className="flex-col flex  overflow-hidden text-sm"
						style={{ willChange: "height, opacity", transformOrigin: "top" }}
						aria-expanded={isModerationOpen}>
						<div className="flex flex-col  bg-neutral-900/30">
							<div className="flex flex-row gap-4 py-2 items-center cursor-not-allowed  hover:bg-neutral-600/30 transition duration-300">
								<FaHammer className="size-5 shrink-0 ml-9 pb-0.5" />
								<span>Moderation</span>
							</div>
							<div className="flex flex-row gap-4 py-2 items-center cursor-not-allowed hover:bg-neutral-600/30 transition duration-300">
								<FaRobot className="size-5 shrink-0 ml-9 pb-0.5" />
								<span>Basic Automod</span>
							</div>
							<div className="flex flex-row gap-4 py-2 items-center cursor-not-allowed hover:bg-neutral-600/30 transition duration-300">
								<FaRobot className="size-5 shrink-0 ml-9 pb-0.5" />
								<span>Advanced Automod</span>
							</div>
							<div className="flex flex-row gap-4 py-2 items-center cursor-not-allowed hover:bg-neutral-600/30 transition duration-300">
								<FaDatabase className="size-5 shrink-0 ml-9 pb-0.5" />
								<span>Logging</span>
							</div>
							<div className="flex flex-row gap-4 py-2 items-center cursor-not-allowed hover:bg-neutral-600/30 transition duration-300">
								<FaIdCard className="size-5 shrink-0 ml-9 pb-0.5" />
								<span>Verification</span>
							</div>
						</div>
					</motion.div>
				)}

				<motion.button
					onClick={() => {
						setIsFeedsOpen(!isFeedsOpen);
						setIsCoreOpen(false);
						setIsCustomOpen(false);
						setIsModerationOpen(false);
						setIsRolesOpen(false);
						setIsToolsOpen(false);
						setIsFunOpen(false);
					}}
					layout
					key="Notifications & Feeds Parent"
					className="flex flex-row gap-4 px-4 py-2 relative cursor-pointer items-center hover:bg-neutral-600/30 transition duration-300">
					<MdOutlineRssFeed className="size-5 shrink-0 " />
					<span>Notifications & Feeds</span>
					<motion.div
						className="mt-1 ml-auto "
						initial={{ rotate: 0 }}
						animate={{ rotate: isFeedsOpen ? 180 : 0 }}
						transition={{ duration: 0.3 }}>
						<ChevronDownIcon className="size-5 shrink-0 " />
					</motion.div>
				</motion.button>

				{isFeedsOpen && (
					<motion.div
						key={"feeds-list"}
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: "auto", opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.3, ease: "easeInOut" }}
						className="flex-col flex  overflow-hidden text-sm"
						style={{ willChange: "height, opacity", transformOrigin: "top" }}
						aria-expanded={isFeedsOpen}>
						<div className="flex flex-col  bg-neutral-900/30">
							<div className="flex flex-row gap-4 py-2 items-center cursor-not-allowed  hover:bg-neutral-600/30 transition duration-300">
								<FaBellConcierge className="size-5 shrink-0 ml-9 pb-0.5" />
								<span>General</span>
							</div>
							<div className="flex flex-row gap-4 py-2 items-center cursor-not-allowed hover:bg-neutral-600/30 transition duration-300">
								<FaReddit className="size-5 shrink-0 ml-9 pb-0.5" />
								<span>Reddit</span>
							</div>
							<div className="flex flex-row gap-4 py-2 items-center cursor-not-allowed hover:bg-neutral-600/30 transition duration-300">
								<FaVideo className="size-5 shrink-0 ml-9 pb-0.5" />
								<span>Streaming</span>
							</div>
							<div className="flex flex-row gap-4 py-2 items-center cursor-not-allowed hover:bg-neutral-600/30 transition duration-300">
								<FaYoutube className="size-5 shrink-0 ml-9 pb-0.5" />
								<span>Youtube</span>
							</div>
							<div className="flex flex-row gap-4 py-2	 items-center cursor-not-allowed hover:bg-neutral-600/30 transition duration-300">
								<FaRss className="size-5 shrink-0 ml-9 pb-0.5" />
								<span>RSS Feeds</span>
							</div>
							<div className="flex flex-row gap-4 py-2 items-center cursor-not-allowed hover:bg-neutral-600/30 transition duration-300">
								<FaTwitch className="size-5 shrink-0 ml-9 pb-0.5" />
								<span>Twitch</span>
							</div>
						</div>
					</motion.div>
				)}

				<motion.button
					onClick={() => {
						setIsRolesOpen(!isRolesOpen);
						setIsCoreOpen(false);
						setIsCustomOpen(false);
						setIsModerationOpen(false);
						setIsFeedsOpen(false);
						setIsToolsOpen(false);
						setIsFunOpen(false);
					}}
					layout
					key="Roles Parent"
					className="flex flex-row gap-4 px-4 py-2 relative cursor-pointer items-center 	hover:bg-neutral-600/30 transition duration-300">
					<FaTags className="size-5 shrink-0 " />
					<span>Roles</span>
					<motion.div
						className="mt-1 ml-auto "
						initial={{ rotate: 0 }}
						animate={{ rotate: isRolesOpen ? 180 : 0 }}
						transition={{ duration: 0.3 }}>
						<ChevronDownIcon className="size-5 shrink-0 " />
					</motion.div>
				</motion.button>

				{isRolesOpen && (
					<motion.div
						key={"roles-list"}
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: "auto", opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.3, ease: "easeInOut" }}
						className="flex-col flex  overflow-hidden text-sm"
						style={{ willChange: "height, opacity", transformOrigin: "top" }}
						aria-expanded={isRolesOpen}>
						<div className="flex flex-col  bg-neutral-900/30 ">
							<div className="flex flex-row gap-4 py-2 items-center cursor-not-allowed  hover:bg-neutral-600/30 transition duration-300">
								<FaUserPlus className="size-5 shrink-0 ml-9 pb-0.5" />
								<span>Autorole</span>
							</div>
							<div className="flex flex-row gap-4 py-2 items-center cursor-not-allowed hover:bg-neutral-600/30 transition duration-300">
								<FaTags className="size-5 shrink-0 ml-9 pb-0.5" />
								<span>Role Commands</span>
							</div>
							<div className="flex flex-row gap-4 py-2 items-center cursor-not-allowed hover:bg-neutral-600/30 transition duration-300">
								<FaMicrophone className="size-5 shrink-0 ml-9 pb-0.5" />
								<span>Voice Roles</span>
							</div>
						</div>
					</motion.div>
				)}

				<motion.button
					layout
					onClick={() => {
						setIsToolsOpen(!isToolsOpen);
						setIsCoreOpen(false);
						setIsCustomOpen(false);
						setIsModerationOpen(false);
						setIsFeedsOpen(false);
						setIsRolesOpen(false);
						setIsFunOpen(false);
					}}
					key="Tools & Utilities Parent"
					className="flex flex-row gap-4 px-4 py-2 relative cursor-pointer items-center hover:bg-neutral-600/30 transition duration-300">
					<FaToolbox className="size-5 shrink-0 " />
					<span>Tools & Utilities</span>
					<motion.div
						className="mt-1 ml-auto "
						initial={{ rotate: 0 }}
						animate={{ rotate: isToolsOpen ? 180 : 0 }}
						transition={{ duration: 0.3 }}>
						<ChevronDownIcon className="size-5 shrink-0 " />
					</motion.div>
				</motion.button>

				{isToolsOpen && (
					<motion.div
						key={"tools-list"}
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: "auto", opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.3, ease: "easeInOut" }}
						className="flex-col flex  overflow-hidden text-sm"
						style={{ willChange: "height, opacity", transformOrigin: "top" }}
						aria-expanded={isToolsOpen}>
						<div className="flex flex-col  bg-neutral-900/30 ">
							<div className="flex flex-row gap-4 py-2 items-center cursor-not-allowed  hover:bg-neutral-600/30 transition duration-300">
								<FaTicket className="size-5 shrink-0 ml-9 pb-0.5" />
								<span>Ticket System</span>
							</div>
						</div>
					</motion.div>
				)}

				<motion.button
					onClick={() => {
						setIsFunOpen(!isFunOpen);
						setIsCoreOpen(false);
						setIsCustomOpen(false);
						setIsModerationOpen(false);
						setIsFeedsOpen(false);
						setIsRolesOpen(false);
						setIsToolsOpen(false);
					}}
					layout
					key="Fun Parent"
					className="flex flex-row gap-4 px-4 py-2 relative cursor-pointer items-center hover:bg-neutral-600/30 transition duration-300">
					<IoHappy className="size-5 shrink-0 " />
					<span>Fun</span>
					<motion.div
						className="mt-1 ml-auto "
						initial={{ rotate: 0 }}
						animate={{ rotate: isFunOpen ? 180 : 0 }}
						transition={{ duration: 0.3 }}>
						<ChevronDownIcon className="size-5 shrink-0 " />
					</motion.div>
				</motion.button>

				{isFunOpen && (
					<motion.div
						key={"fun-list"}
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: "auto", opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.3, ease: "easeInOut" }}
						className="flex-col flex  overflow-hidden text-sm"
						style={{ willChange: "height, opacity", transformOrigin: "top" }}
						aria-expanded={isToolsOpen}>
						<div className="flex flex-col  bg-neutral-900/30 ">
							<div className="flex flex-row gap-4 py-2 items-center cursor-not-allowed  hover:bg-neutral-600/30 transition duration-300">
								<FaBoxOpen className="size-5 shrink-0 ml-9 pb-0.5" />
								<span>Throw Command</span>
							</div>
							<div className="flex flex-row gap-4 py-2 items-center cursor-not-allowed  hover:bg-neutral-600/30 transition duration-300">
								<FaStar className="size-5 shrink-0 ml-9 pb-0.5" />
								<span>Starboard</span>
							</div>
							<div className="flex flex-row gap-4 py-2 items-center cursor-not-allowed  hover:bg-neutral-600/30 transition duration-300">
								<FaTrophy className="size-5 shrink-0 ml-9 pb-0.5" />
								<span>Levels</span>
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
			<motion.div
				layout
				className="flex flex-row gap-4 mt-15 px-4 py-1 relative cursor-not-allowed items-center hover:bg-neutral-600/30 transition duration-300">
				<FaQuestion className="size-5 shrink-0 " />
				<span>Documentation</span>
			</motion.div>
		</motion.nav>
	);
}
