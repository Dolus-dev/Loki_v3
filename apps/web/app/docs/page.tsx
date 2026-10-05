import type { Metadata } from "next";
import {
	FaBookOpen,
	FaListUl,
	FaRocket,
	FaSliders,
	FaUserShield,
} from "react-icons/fa6";
import UnderConstruction from "../components/UnderConstruction";

export const metadata: Metadata = {
	title: "LOKI | Docs",
	description: "Guides and a full command reference for Loki. Coming soon.",
};

/** The docs page, for now an "under construction" placeholder listing the planned sections. */
export default function DocumentationPage() {
	return (
		<UnderConstruction
			title="Docs under construction"
			description="We're writing guides to help you get the most out of Loki. Here's what the docs will cover:"
			planned={[
				{
					icon: <FaRocket />,
					name: "Getting started",
					description: "Adding Loki to your server and the first things to set up",
				},
				{
					icon: <FaListUl />,
					name: "Command reference",
					description: "Every command, its options and who can use it",
				},
				{
					icon: <FaSliders />,
					name: "Dashboard guide",
					description: "What each setting does and how to change it",
				},
				{
					icon: <FaUserShield />,
					name: "Permissions & access",
					description: "The permissions Loki needs and who can manage it",
				},
				{
					icon: <FaBookOpen />,
					name: "FAQ & troubleshooting",
					description: "Answers to common questions and fixes for common issues",
				},
			]}
			supportText="Until then, our Discord server is the best place to ask questions."
		/>
	);
}
