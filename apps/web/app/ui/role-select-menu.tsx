"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { FaCheck, FaChevronDown } from "react-icons/fa";
import type { ReturnedRole } from "./role-multi-select-menu";

interface RoleSelectMenuProps {
	options: ReturnedRole[];
	/** The selected role's ID, or null for none. */
	value: string | null;
	onChange: (roleId: string | null) => void;
	/** Label of the "nothing selected" choice, e.g. "No mute role". */
	noneLabel?: string;
	/**
	 * Whether "nothing selected" can be chosen. Defaults to true. When false, the none option
	 * isn't offered: a setting that starts empty can be filled in, but once a role is picked
	 * it can only be changed to another role, never cleared.
	 */
	allowNone?: boolean;
	/** Shown while nothing is selected and `allowNone` is false. */
	placeholder?: string;
	className?: string;
	/** Read-only: shows the selection but can't be opened or changed. */
	disabled?: boolean;
}

/** A role's color as CSS; Discord's 0 means "no color", shown as its default grey. */
const roleColor = (role: ReturnedRole) =>
	role.color ? `#${role.color.toString(16).padStart(6, "0")}` : "#99aab5";

/**
 * Picks one role (or none). The single-choice sibling of `RoleMultiSelectMenu`, with the
 * same look: roles are listed highest first, each with its color dot.
 */
export default function RoleSelectMenu(props: RoleSelectMenuProps) {
	const {
		options,
		value,
		onChange,
		noneLabel = "No role",
		allowNone = true,
		placeholder = "Select a role...",
		className,
		disabled,
	} = props;
	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	// Sort a copy: `options` is usually SWR's cached array, which must not be mutated
	const sortedOptions = [...options].sort((a, b) => b.position - a.position);
	const selected = options.find((role) => role.id === value);

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
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const choose = (roleId: string | null) => {
		onChange(roleId);
		setIsOpen(false);
	};

	return (
		<div
			ref={dropdownRef}
			className={`relative ${className || ""}`}>
			<button
				type="button"
				disabled={disabled}
				aria-haspopup="listbox"
				aria-expanded={isOpen}
				onClick={() => setIsOpen(!isOpen)}
				className="w-full bg-neutral-800 rounded-md flex flex-row items-center gap-2 p-2 min-h-[42px] text-left cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">
				{selected ? (
					<>
						<span
							className="size-2 rounded-full shrink-0"
							style={{ backgroundColor: roleColor(selected) }}></span>
						<span className="flex-1 text-neutral-200 text-sm">
							{selected.name}
						</span>
					</>
				) : (
					<span className="flex-1 text-neutral-500">
						{/* A saved role that no longer exists in the server shows as "unknown" */}
						{value
							? "Unknown role (deleted?)"
							: allowNone
								? noneLabel
								: placeholder}
					</span>
				)}
				<motion.span
					animate={{ rotate: isOpen ? 180 : 0 }}
					transition={{ duration: 0.2 }}>
					<FaChevronDown className="size-4 text-neutral-400" />
				</motion.span>
			</button>

			<AnimatePresence>
				{isOpen && !disabled && (
					<motion.div
						role="listbox"
						initial={{ opacity: 0, scale: 0.95, y: -10 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.95, y: -10 }}
						transition={{ type: "spring", stiffness: 500, damping: 30 }}
						className="absolute z-10 w-full mt-2 bg-neutral-800 rounded-md shadow-lg max-h-60 overflow-y-auto">
						{allowNone && (
							<button
								type="button"
								role="option"
								aria-selected={value === null}
								onClick={() => choose(null)}
								className="w-full px-4 py-2 flex items-center gap-3 hover:bg-neutral-600/30 transition-colors text-left">
								<span className="size-4 shrink-0">
									{value === null && (
										<FaCheck className="size-4 text-brand-500" />
									)}
								</span>
								<span className="text-neutral-400 text-sm">{noneLabel}</span>
							</button>
						)}
						{sortedOptions.map((role) => (
							<button
								key={role.id}
								type="button"
								role="option"
								aria-selected={role.id === value}
								onClick={() => choose(role.id)}
								className="w-full px-4 py-2 flex items-center gap-3 hover:bg-neutral-600/30 transition-colors text-left">
								<span className="size-4 shrink-0">
									{role.id === value && (
										<FaCheck className="size-4 text-brand-500" />
									)}
								</span>
								<span
									className="size-2 rounded-full shrink-0"
									style={{ backgroundColor: roleColor(role) }}></span>
								<span className="text-neutral-200 text-sm">{role.name}</span>
							</button>
						))}
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
