"use client";

import { motion } from "motion/react";
import { useId } from "react";

interface ToggleProps {
	checked: boolean;
	onChange: (checked: boolean) => void;
	/** Text shown beside the switch; clicking it toggles too. */
	label?: string;
	/** Accessible name for a toggle without a visible `label`. */
	ariaLabel?: string;
	disabled?: boolean;
	className?: string;
}

export default function Toggle(props: ToggleProps) {
	const { checked, onChange, label, ariaLabel, disabled, className } = props;
	const id = useId();

	return (
		<div className={`flex flex-row gap-2 ${className || ""}`}>
			<button
				id={id}
				type="button"
				role="switch"
				aria-checked={checked}
				aria-label={label ? undefined : ariaLabel}
				disabled={disabled}
				onClick={() => onChange(!checked)}
				className={`relative inline-flex h-7 w-14 scale-90 items-center rounded-full cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed
					${checked ? "bg-brand-600" : "bg-danger-400"} duration-600`}>
				<motion.span
					className="inline-block h-5 w-5.5 rounded-full bg-white shadow"
					layout
					transition={{
						type: "spring",
						stiffness: 300,
						damping: 50,
					}}
					animate={{
						x: checked ? 31 : 1,
					}}></motion.span>
			</button>
			{label && (
				<label htmlFor={id} className="text-neutral-200 mt-1 font-semibold">
					{label}
				</label>
			)}
		</div>
	);
}
