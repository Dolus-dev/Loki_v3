"use client";

import { useState } from "react";
import NumberInput from "./number-input";

const UNITS = [
	{ name: "seconds", seconds: 1 },
	{ name: "minutes", seconds: 60 },
	{ name: "hours", seconds: 3600 },
	{ name: "days", seconds: 86400 },
] as const;

type UnitName = (typeof UNITS)[number]["name"];

const MAX_INT32 = 2_147_483_647;

/** The largest unit that divides `seconds` evenly, or `fallback` when it is 0 (any unit fits). */
function pickUnit(seconds: number, fallback: UnitName): UnitName {
	if (seconds === 0) {
		return fallback;
	}

	const unit = [...UNITS].reverse().find((u) => seconds % u.seconds === 0);
	return unit?.name ?? "seconds";
}

interface DurationInputProps {
	/** The duration in seconds. */
	value: number;
	/** Called with the new duration in seconds. */
	onChange: (seconds: number) => void;
	/** Smallest duration in seconds. Defaults to 0. */
	min?: number;
	/** Largest duration in seconds. Defaults to the largest value the backend accepts. */
	max?: number;
	/** Unit shown while the value is 0. Defaults to minutes. */
	defaultUnit?: UnitName;
	/** Accessible name for the input. */
	label?: string;
	className?: string;
}

/**
 * A duration field that is edited as an amount plus a unit (seconds, minutes, hours or
 * days) but reports seconds. The unit follows the value: a value loaded from the backend
 * is shown in the largest unit that fits it exactly (3600 → 1 hour), while changing the
 * unit keeps the amount (5 minutes → 5 hours), capped at `max`.
 */
export default function DurationInput(props: DurationInputProps) {
	const {
		value,
		onChange,
		min = 0,
		max = MAX_INT32,
		defaultUnit = "minutes",
		label,
		className,
	} = props;

	const [unit, setUnit] = useState<UnitName>(() => pickUnit(value, defaultUnit));
	// The last value this component reported (or was given). A different `value` means
	// the parent replaced it (e.g. the saved settings finished loading), so re-pick the unit.
	const [syncedValue, setSyncedValue] = useState(value);

	if (value !== syncedValue) {
		setSyncedValue(value);
		setUnit(pickUnit(value, unit));
	}

	// Offer only units that fit under the maximum, e.g. no "days" for a 1 hour cap
	const units = UNITS.filter((u) => u.seconds <= max);
	const unitSeconds =
		(units.find((u) => u.name === unit) ?? units[0] ?? UNITS[0]).seconds;

	const report = (seconds: number) => {
		setSyncedValue(seconds);
		onChange(seconds);
	};

	const handleAmountChange = (amount: number) => report(amount * unitSeconds);

	const handleUnitChange = (name: UnitName) => {
		const next = UNITS.find((u) => u.name === name) ?? UNITS[0];
		const amount = value / unitSeconds;
		const capped = Math.min(amount, Math.floor(max / next.seconds));

		setUnit(name);
		report(Math.max(capped * next.seconds, min));
	};

	return (
		<div
			role="group"
			aria-label={label}
			className={`flex items-center gap-2 ${className || ""}`}>
			<NumberInput
				value={value / unitSeconds}
				onChange={handleAmountChange}
				min={Math.ceil(min / unitSeconds)}
				max={Math.floor(max / unitSeconds)}
				className="max-w-40"
			/>
			<select
				aria-label={label ? `${label} unit` : "Unit"}
				value={unit}
				onChange={(e) => handleUnitChange(e.target.value as UnitName)}
				className="bg-neutral-800 text-neutral-200 rounded-md p-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-600">
				{units.map((u) => (
					<option key={u.name} value={u.name}>
						{u.name}
					</option>
				))}
			</select>
		</div>
	);
}
