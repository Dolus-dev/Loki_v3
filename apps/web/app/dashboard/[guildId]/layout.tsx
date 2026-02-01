import { Metadata } from "next";
import DashboardLayoutNav from "../../components/Dashboard Layout Nav/Layout Nav";
import { useUser } from "../../lib/hooks/useUser";
import { redirect } from "next/navigation";

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
			<div className="flex flex-row relative place-self-center w-full 2xl:max-w-[1800px] overflow-hidden  ">
				<DashboardLayoutNav />
				<div className="bg-neutral-800/30 w-full ">{children}</div>
			</div>
		</div>
	);
}
