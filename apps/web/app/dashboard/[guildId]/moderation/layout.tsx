import { Metadata } from "next";

// The moderation tabs live in each page (see _components/moderation-settings-form.tsx);
// this layout only sets the browser tab title for the whole section
export const metadata: Metadata = {
	title: "LOKI | Moderation",
};

export default function ModerationLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return children;
}
