"use client";

import * as motion from "motion/react-client";
import { useEffect, useState } from "react";
import { IoSunnySharp, IoMoonSharp } from "react-icons/io5";

// May be changed to a popover effect in the future

export default function LayoutAnimation() {
	const [isDark, setIsDark] = useState(false);

	useEffect(() => {
		const theme = document.documentElement.getAttribute("data-theme");
		setIsDark(theme === "dark");
	}, []);

	const toggleSwitch = () => {
		setIsDark((prev) => {
			const next = !prev;
			const nextTheme = next ? "dark" : "light";

			// Persist to cookie (1 year)
			document.cookie = `theme=${nextTheme}; path=/; max-age=31536000; SameSite=Lax`;

			// Update DOM immediately for smooth transition
			document.documentElement.setAttribute("data-theme", nextTheme);

			return next;
		});
	};

	return (
		<button
			className="toggle-container"
			style={{
				...container,
				justifyContent: "flex-" + (isDark ? "start" : "end"),
			}}
			onClick={toggleSwitch}>
			<motion.div
				className="toggle-handle"
				layout
				transition={{
					type: "spring",
					visualDuration: 0.4,
					bounce: 0.2,
				}}>
				<motion.span
					key={isDark ? "moon" : "sun"}
					initial={{ opacity: 0, y: 0, scale: 1 }}
					animate={{ opacity: 1, y: 0, scale: 1 }}
					exit={{ opacity: 0, y: 6, scale: 1 }}
					transition={{ duration: 0.3 }}
					className="grid place-items-center ">
					{isDark ? (
						<IoMoonSharp className="shrink-0 size-8 text-neutral-100" />
					) : (
						<IoSunnySharp className="shrink-0 size-8 text-yellow-300/80 " />
					)}
				</motion.span>
			</motion.div>
		</button>
	);
}

/**
 * ==============   Styles   ================
 */

const container = {
	width: 80,
	height: 40,
	backgroundColor: "var(--theme-toggler-bg)",
	borderRadius: 50,
	cursor: "pointer",
	display: "flex",
	padding: 5,
};
