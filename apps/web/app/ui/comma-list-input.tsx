"use client";

import { useId, useState } from "react";

interface CommaListInputProps {
	/** The list, used as the starting text. Later changes to it are NOT picked up (see below). */
	value: string[];
	/** Called with the parsed list on every keystroke. */
	onChange: (items: string[]) => void;
	label: string;
	/** Shows an "N / max items" counter, turning red above the limit. */
	maxItems?: number;
	disabled?: boolean;
	className?: string;
}

/** Splits "a, b,, c ," into ["a", "b", "c"]. */
function parseItems(text: string): string[] {
	return text
		.split(",")
		.map((item) => item.trim())
		.filter((item) => item.length > 0);
}

/**
 * A textarea for a comma-separated list that reports the list as an array.
 *
 * It keeps its own text, so what the user types (a trailing comma, extra spaces) stays
 * exactly as typed instead of being re-formatted from the parsed list on every keystroke.
 * That means it only reads `value` when it mounts: to load a different list (after a
 * save or discard), give it a new React `key`, e.g. `useSettingsForm`'s `resetKey`.
 */
export default function CommaListInput(props: CommaListInputProps) {
	const { value, onChange, label, maxItems, disabled, className } = props;
	const id = useId();
	const [text, setText] = useState(() => value.join(", "));

	const count = parseItems(text).length;
	const overLimit = maxItems !== undefined && count > maxItems;

	return (
		<div className={`flex flex-col gap-2 ${className || ""}`}>
			<div className="flex flex-row justify-between">
				<label htmlFor={id} className="text-neutral-200 font-semibold">
					{label}
				</label>
				{maxItems !== undefined && (
					<span className={`text-sm ${overLimit ? "text-danger-400" : "text-neutral-400"}`}>
						{count} / {maxItems} items
					</span>
				)}
			</div>
			<textarea
				id={id}
				value={text}
				disabled={disabled}
				onChange={(e) => {
					setText(e.target.value);
					onChange(parseItems(e.target.value));
				}}
				className="w-full p-2 rounded-md bg-neutral-800 resize-y min-h-[10vh] max-h-[30vh] text-neutral-200 disabled:opacity-60 disabled:cursor-not-allowed"
			/>
		</div>
	);
}
