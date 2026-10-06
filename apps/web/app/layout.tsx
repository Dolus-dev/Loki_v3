import type { Metadata } from "next";
import "./globals.css";
import { cookies } from "next/headers";
import { Theme } from "./lib/enums";
import isValidTheme from "./lib/validateTheme";
import { UserProvider } from "./lib/hooks/useUser";
import RootLayoutHeader from "./components/Root Layout Header/Header";
import { Hanuman } from "next/font/google";
import { PostHogProvider } from "./postHogProvider";

const hanuman = Hanuman({ subsets: ["latin"] });

/** Fonts to be chosen Later  */

export const metadata: Metadata = {
	title: "LOKI",
	description:
		"Loki is a free, fully customizable Discord moderation bot with a web dashboard.",
};

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang="en"
			className={`scroll-smooth ${hanuman.className}`}
			data-scroll-behavior="smooth">
			<body
				className={`antialiased relative  flex flex-col min-h-screen transition-colors duration-300 bg-neutral-900 text-neutral-100`}>
				<PostHogProvider>
					<UserProvider>
						<RootLayoutHeader />
						{/* flex-1: fills the screen, so on short pages the phone footer sits at the bottom.
						    md:pb-20 = the fixed footer's height (md:h-20), so pages scroll clear of it;
						    phones don't need it because their footer isn't fixed. */}
						<div className="flex-1 md:pb-20">{children}</div>
						{/* An ordinary footer at the end of the page on phones (fixed would cover
						    too much of a small screen); fixed to the bottom from md up.
						    md:z-20 keeps the fixed footer above page content that has its own
						    z-index (like the server icons). Layers above it, lowest first: the
						    header (z-25), the dashboard's slide-out backdrop (z-30) and menu (z-40),
						    and open dropdown menus (z-50), which always sit on top. */}
						<footer>
							<div className="w-full h-14 md:h-20 bg-brand-900 dark:bg-brand-900 md:fixed md:bottom-0 md:z-20 flex items-center justify-center">
								<p className="text-sm md:text-base text-neutral-300">
									© 2024 Loki App. All rights reserved.
								</p>
							</div>
						</footer>
					</UserProvider>
				</PostHogProvider>
			</body>
		</html>
	);
}
