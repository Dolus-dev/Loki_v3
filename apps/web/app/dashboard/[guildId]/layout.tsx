import { Metadata } from "next";
import DashboardLayoutNav from "../../components/Dashboard Layout Nav/Layout Nav";

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
		<>
			<div className="flex flex-row relative   ">
				<DashboardLayoutNav />
				<div className="ml-80">{children}</div>
			</div>
		</>
	);
}
