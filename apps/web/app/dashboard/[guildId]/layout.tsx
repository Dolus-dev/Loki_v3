import { Metadata } from "next";
import DashboardShell from "../../components/Dashboard Layout Nav/DashboardShell";
import { GuildAccessProvider } from "../../lib/hooks/useGuildAccess";

// TODO: Add dynamic metadata based on guild ID/Name

export const metadata: Metadata = {
	title: "LOKI | Dashboard",
	description: "Manage your guild with Loki's powerful dashboard.",
};

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="relative ">
			{/* The dashboard's background tint, painted on a layer pinned to the whole viewport
			    behind everything, so short pages don't stop halfway down the screen. Being
			    `fixed`, it takes up no space and never causes scrolling. */}
			<div aria-hidden className="fixed inset-0 -z-10 bg-neutral-800/30" />
			{/* Nothing below renders unless the user has at least view access to this guild */}
			<GuildAccessProvider>
				{/* Sidebar + page; the sidebar becomes a slide-out menu below lg */}
				<DashboardShell>{children}</DashboardShell>
			</GuildAccessProvider>
		</div>
	);
}
