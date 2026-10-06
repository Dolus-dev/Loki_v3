"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { FaChevronDown, FaRegCheckSquare } from "react-icons/fa";
import { FaHashtag, FaX } from "react-icons/fa6";
import { ChannelType } from "discord-api-types/v10";
import { MdKeyboardVoice, MdOutlineForum } from "react-icons/md";

import { MegaphoneIcon } from "@heroicons/react/24/solid";
import { GiTheaterCurtains } from "react-icons/gi";

export interface ReturnedChannel {
	id: string;
	name: string;
	type?: ChannelType;
}

/** One category and its channels, as returned by GET /guilds/:guildId/channels. */
export interface ReturnedChannelGroup {
	category: string;
	children: ReturnedChannel[];
}

interface ChannelMultiSelectMenuProps {
	options: ReturnedChannelGroup[];
	value: string[];
	onChange: (selected: string[]) => void;
	placeholder?: string;
	className?: string;
	/** Read-only: shows the selection but can't be opened or changed. */
	disabled?: boolean;
	/**
	 * Channel IDs to leave out of the dropdown. Only for lists that contradict each other,
	 * where one channel in both makes no sense and the backend rejects it (e.g. a command's
	 * whitelist and blacklist). Don't use it between unrelated settings: users may pick the
	 * same channel for several features.
	 */
	exclude?: string[];
}

const getChannelIcon = (type?: ChannelType) => {
	switch (type) {
		case ChannelType.GuildVoice:
			return (
				<MdKeyboardVoice className="size-5 -mr-1 text-neutral-300 shrink-0" />
			);
		case ChannelType.GuildStageVoice:
			return <GiTheaterCurtains className="size-4 text-neutral-300 shrink-0" />;
		case ChannelType.GuildText:
			return <FaHashtag className="size-4 text-neutral-300 shrink-0" />;
		case ChannelType.GuildAnnouncement:
			return <MegaphoneIcon className="size-4 shrink-0 text-neutral-300" />;
		case ChannelType.GuildForum:
		case ChannelType.GuildMedia:
			return <MdOutlineForum className="size-4 text-neutral-300 shrink-0" />;
		default:
			return <span className="size-4 text-neutral-400 shrink-0">•</span>;
	}
};

export default function ChannelMultiSelectMenu(
	props: ChannelMultiSelectMenuProps
) {
	const {
		options,
		value,
		onChange,
		placeholder,
		className,
		disabled,
		exclude = [],
	} = props;

	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const selectedChannels = options
		.flatMap((group) => group.children)
		.filter((channel) => value.includes(channel.id));
	// Channels already selected here stay listed even if excluded, so they can be unticked
	const shownOptions = options
		.map((group) => ({
			...group,
			children: group.children.filter(
				(channel) => !exclude.includes(channel.id) || value.includes(channel.id),
			),
		}))
		.filter((group) => group.children.length > 0);

	const handleRemove = (idToRemove: string) => {
		onChange(value.filter((id) => id !== idToRemove));
	};

	const handleToggle = (channelId: string) => {
		if (value.includes(channelId)) {
			onChange(value.filter((id) => id !== channelId));
		} else {
			onChange([...value, channelId]);
		}
	};

	// Click outside detection
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, []);

	return (
		<div
			ref={dropdownRef}
			className={`relative ${className}`}>
			<div
				onClick={(e) => {
					e.stopPropagation();
					if (!disabled) setIsOpen(!isOpen);
				}}
				aria-disabled={disabled}
				className={`bg-neutral-800 rounded-md flex flex-row p-2 min-h-[42px] ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"} ${className || ""} `}>
				{/* Tag Display Area */}
				<div className="flex flex-wrap gap-2 flex-1">
					{selectedChannels.length === 0 && (
						<span className="text-neutral-500">
							{placeholder || "Select channels..."}
						</span>
					)}
					{selectedChannels.map((channel) => (
						<motion.div
							key={channel.id}
							initial={{ opacity: 0, scale: 0.8 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.8 }}
							className="bg-neutral-700/60 rounded-md py-1 relative flex items-center gap-2 px-2">
							{getChannelIcon(channel.type)}
							<span className="text-neutral-200 text-sm">{channel.name}</span>

							{!disabled && (
								<button
									type="button"
									onClick={(e) => {
										e.preventDefault();
										e.stopPropagation();
										handleRemove(channel.id);
									}}
									className="text-neutral-400 hover:text-neutral-200 text-sm cursor-pointer">
									<FaX className="size-3 shrink-0" />
								</button>
							)}
						</motion.div>
					))}
				</div>

				<motion.div
					animate={{ rotate: isOpen ? 180 : 0 }}
					transition={{ duration: 0.2 }}
					className="place-self-center">
					<FaChevronDown className="size-4 text-neutral-400" />
				</motion.div>
			</div>

			{/* Dropdown Menu */}

			<AnimatePresence>
				{isOpen && !disabled && (
					<motion.div
						initial={{ opacity: 0, scale: 0.95, y: -10 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.95, y: -10 }}
						transition={{ type: "spring", stiffness: 500, damping: 30 }}
						className="absolute z-50 w-full mt-2 bg-neutral-800 rounded-md shadow-lg max-h-60 scrollbar-thin scrollbar-track-rounded-lg scrollbar-thumb-brand-800 scrollbar-thumb-rounded-full scrollbar-hover:scrollbar-thumb-brand-800/60 scrollbar-track-neutral-700 overflow-y-auto">
						{/* Keyed by position too: two categories can share a name */}
						{shownOptions.map((group, index) => (
							<div key={`${index}-${group.category}`}>
								<div className="w-full px-4 py-2 items-center text-left">
									{group.category}
								</div>
								{group.children.map((channel) => {
									const isSelected = value.includes(channel.id);

									return (
										<button
											key={channel.id}
											type="button"
											onClick={(e) => {
												e.preventDefault();
												e.stopPropagation();
												handleToggle(channel.id);
											}}
											className="w-full px-4 py-2 flex items-center gap-3 hover:bg-neutral-600/30 transition-colors text-left flex-row">
											{isSelected ? (
												<FaRegCheckSquare className="size-4 text-green-400 shrink-0" />
											) : (
												<div className="size-4 border-2 border-neutral-500 rounded-sm shrink-0" />
											)}

											{getChannelIcon(channel.type)}
											<span className="truncate">{channel.name}</span>
										</button>
									);
								})}
							</div>
						))}
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
