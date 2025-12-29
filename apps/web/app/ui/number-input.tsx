"use client";

import { FaMinus, FaPlus } from "react-icons/fa";

interface NumberInputProps {
	value: number;
	onChange: (value: number) => void;
	min?: number;
	max?: number;
	step?: number;
	placeholder?: string;
	className?: string;
}

export default function NumberInput(props: NumberInputProps) {
	const {
		value,
		onChange,
		min = 0,
		max,
		step = 1,
		placeholder,
		className,
	} = props;

	const handleIncrement = () => {
		const newValue = value + step;
		if (max === undefined || newValue <= max) {
			onChange(newValue);
		}
	};

	const handleDecrement = () => {
		const newValue = value - step;
		if (min === undefined || newValue >= min) {
			onChange(newValue);
		}
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const inputValue = e.target.value;

		if (inputValue === "") {
			onChange(min);
			return;
		}
		const numValue = parseInt(inputValue, 10);

		if (!isNaN(numValue)) {
			let constrainedValue = numValue;
			if (constrainedValue < min) constrainedValue = min;
			if (max !== undefined && constrainedValue > max) constrainedValue = max;

			onChange(constrainedValue);
		}
	};

	return (
		<div className={`flex items-center gap-2 ${className || ""}`}>
			<button
				onClick={handleDecrement}
				type="button"
				disabled={value <= min}
				className="bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed text-neutral-200 rounded-md p-2 transition-colors">
				<FaMinus className="size-4" />
			</button>

			<input
				type="text"
				inputMode="numeric"
				value={value}
				onChange={handleInputChange}
				placeholder={placeholder}
				className="bg-neutral-800 text-neutral-200 text-center rounded-md p-2  focus:outline-none focus:ring-2 focus:ring-brand-600"
			/>

			<button
				type="button"
				onClick={handleIncrement}
				disabled={max !== undefined && value >= max}
				className="bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed text-neutral-200 rounded-md p-2 transition-colors">
				<FaPlus className="size-4" />
			</button>
		</div>
	);
}
