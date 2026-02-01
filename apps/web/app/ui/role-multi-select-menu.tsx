"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { FaChevronDown, FaRegCheckSquare } from "react-icons/fa";
import { FaRegSquare, FaX } from "react-icons/fa6";

export interface ReturnedRole {
	id: string;
	name: string;
	position: number;
	color?: number;
}

interface RoleMultiSelectMenuProps {
	options: ReturnedRole[];
	value: string[];
	onChange: (selected: string[]) => void;
	placeholder?: string;
	className?: string;
}

export default function RoleMultiSelectMenu(props: RoleMultiSelectMenuProps) {
	const { options, value, onChange, placeholder, className } = props;
	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	console.log(value);

	const selectedRoles: ReturnedRole[] = options.filter((option) =>
		value.includes(option.id)
	);
	options.sort((a, b) => b.position - a.position);
	selectedRoles.sort((a, b) => a.position - b.position);

	console.log(selectedRoles);

	const handleRemove = (idToRemove: string) => {
		onChange(value.filter((id) => id !== idToRemove));
	};
	const handleToggle = (roleId: string) => {
		if (value.includes(roleId)) {
			onChange(value.filter((id) => id !== roleId));
		} else {
			onChange([...value, roleId]);
		}
	};

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
					setIsOpen(!isOpen);
				}}
				className={`bg-neutral-800 rounded-md flex flex-row p-2 min-h-[42px] cursor-pointer ${className}`}>
				{/* Tag Display Area */}
				<div className="flex flex-wrap gap-2 flex-1">
					{selectedRoles.length === 0 && (
						<span className="text-neutral-500">
							{placeholder || "Select Roles..."}
						</span>
					)}
					{selectedRoles.map((role) => (
						<motion.div
							key={role.id}
							initial={{ opacity: 0, scale: 0.8 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.8 }}
							className="bg-neutral-700/60 rounded-md py-1 relative flex items-center gap-2 px-2">
							<span
								className="size-2 rounded-full"
								style={{
									backgroundColor: `#${role.color?.toString(16).padStart(6, "0") ?? "99aab5"}`,
								}}></span>

							{/* Option Label */}
							<span className="text-neutral-200 text-sm">{role.name}</span>

							{/* Remove Button */}

							<button
								type="button"
								onClick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									handleRemove(role.id);
								}}
								className="text-neutral-400 hover:text-neutral-200 text-sm cursor-pointer">
								<FaX className="size-3 shrink-0" />
							</button>
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
				{isOpen && (
					<motion.div
						initial={{ opacity: 0, scale: 0.95, y: -10 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.95, y: -10 }}
						transition={{ type: "spring", stiffness: 500, damping: 30 }}
						className="absolute z-10 w-full mt-2 bg-neutral-800 rounded-md shadow-lg max-h-60 scrollbar-thin scrollbar-track-rounded-lg scrollbar-thumb-brand-800 scrollbar-thumb-rounded-full scrollbar-hover:scrollbar-thumb-brand-800/60 scrollbar-track-neutral-700 overflow-y-auto">
						{options.map((role) => {
							const isSelected = value.includes(role.id);

							return (
								<button
									key={role.id}
									type="button"
									onClick={(e) => {
										e.preventDefault();
										e.stopPropagation();
										handleToggle(role.id);
									}}
									className="w-full px-4 py-2 flex items-center gap-3 hover:bg-neutral-600/30 transition-colors text-left flex-row">
									{isSelected ? (
										<FaRegCheckSquare className="size-4 text-brand-500 shrink-0" />
									) : (
										<FaRegSquare className="size-4 text-neutral-400 shrink-0" />
									)}
									<span
										className="size-2 rounded-full"
										style={{
											backgroundColor: `#${role.color?.toString(16).padStart(6, "0") ?? "99aab5"}`,
										}}></span>
									<span className="text-neutral-200 text-sm">{role.name}</span>
								</button>
							);
						})}
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
