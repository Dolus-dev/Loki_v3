"use client";

import { AnimatePresence, motion } from "motion/react";
import { div } from "motion/react-client";
import { useEffect, useRef, useState } from "react";
import { FaChevronDown, FaRegCheckSquare } from "react-icons/fa";
import { FaX } from "react-icons/fa6";

interface Option {
	id: string;
	label: string;
	color?: string;
}

interface MultiSelectProps {
	options: Option[];
	value: string[];
	onChange: (selected: string[]) => void;
	placeholder?: string;
	className?: string;
}

export default function MultiSelectMenu(props: MultiSelectProps) {
	const { options, value, onChange, placeholder, className } = props;
	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	const selectedOptions = options.filter((option) => value.includes(option.id));

	const handleRemove = (idToRemove: string) => {
		onChange(value.filter((id) => id !== idToRemove));
	};

	const handleToggle = (optionId: string) => {
		if (value.includes(optionId)) {
			onChange(value.filter((id) => id !== optionId));
		} else {
			onChange([...value, optionId]);
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
		return () => document.removeEventListener("mousedown", handleClickOutside);
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
				className={`bg-neutral-800 rounded-md flex flex-row p-2 min-h-[42px] cursor-pointer ${className || ""}`}
				ref={dropdownRef}>
				{/* Tag Display Area */}
				<div className="flex flex-wrap gap-2 flex-1">
					{selectedOptions.length === 0 && (
						<span className="text-neutral-500">
							{placeholder || "Select options..."}
						</span>
					)}

					{selectedOptions.map((option) => (
						<motion.div
							key={option.id}
							initial={{ opacity: 0, scale: 0.8 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.8 }}
							className="bg-neutral-700/60 rounded py-1 relative flex items-center gap-2 px-2 ">
							{/* Colored Dot */}
							<span
								className="size-2 rounded-full"
								style={{ backgroundColor: option.color }}
							/>

							{/* Label */}
							<span className="text-neutral-200 text-sm">{option.label}</span>

							{/* Remove Button */}
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									handleRemove(option.id);
								}}
								className="text-neutral-400 hover:text-neutral-200  text-sm cursor-pointer  ">
								<FaX className="size-3  shrink-0  " />
							</button>
						</motion.div>
					))}
				</div>

				{/* Chevron indicator */}
				<motion.div
					animate={{ rotate: isOpen ? 180 : 0 }}
					transition={{ duration: 0.2 }}
					className="place-self-center">
					<FaChevronDown className="size-4 text-neutral-400 " />
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
						className="absolute z-10 w-full mt-2 bg-neutral-800 rounded-md shadow-lg max-h-60 scrollbar-thin scrollbar-track-rounded-lg scrollbar-thumb-brand-800 scrollbar-thumb-rounded-full scrollbar-hover:scrollbar-thumb-brand-800/60  scrollbar-track-neutral-700 overflow-y-auto">
						{options.map((option) => {
							const isSelected = value.includes(option.id);
							return (
								<button
									key={option.id}
									type="button"
									onClick={() => handleToggle(option.id)}
									className="w-full px-4 py-2 flex items-center gap-3 hover:bg-neutral-600/30 transition-colors text-left flex-row">
									{isSelected ? (
										<FaRegCheckSquare className="size-4 text-green-400 shrink-0" />
									) : (
										<div className="size-4 border-2 border-neutral-500 rounded-sm shrink-0" />
									)}
									{option.color && (
										<span
											className="size-2 rounded-full"
											style={{ backgroundColor: option.color }}
										/>
									)}
									{option.label}
								</button>
							);
						})}
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
