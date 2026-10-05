import type { Metadata } from "next";
import { FaLaptopCode, FaRobot, FaServer } from "react-icons/fa6";
import UnderConstruction from "../components/UnderConstruction";

export const metadata: Metadata = {
	title: "LOKI | Status",
	description: "Live status of Loki's bot, dashboard and API. Coming soon.",
};

/**
 * The status page, for now an "under construction" placeholder naming the components the real
 * page will report on. No live data yet: nothing here should claim a component is up or down.
 */
export default function StatusPage() {
	return (
		<UnderConstruction
			title="Status page under construction"
			description="We're building a live status page so you can check at a glance whether everything is running smoothly. Here's what it will cover:"
			planned={[
				{
					icon: <FaRobot />,
					name: "Discord bot",
					description: "Whether Loki is online and answering commands",
				},
				{
					icon: <FaLaptopCode />,
					name: "Web dashboard",
					description: "Whether you can log in and change settings",
				},
				{
					icon: <FaServer />,
					name: "API",
					description: "The backend the bot and dashboard rely on",
				},
			]}
		/>
	);
}
