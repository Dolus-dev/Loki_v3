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
	disabled?: boolean;
}

export default function NumberInput(props: NumberInputProps) {
	const {
		value,
		onChange,
		min = 0,
		max,
		placeholder,
		className,
		disabled,
	} = props;

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
			<input
				type="text"
				inputMode="numeric"
				value={value}
				onChange={handleInputChange}
				placeholder={placeholder}
				disabled={disabled}
				className="bg-neutral-800 text-neutral-200 text-center rounded-md p-2  focus:outline-none focus:ring-2 focus:ring-brand-600 disabled:opacity-60 disabled:cursor-not-allowed"
			/>
		</div>
	);
}
