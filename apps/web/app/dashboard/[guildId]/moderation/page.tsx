import { redirect } from "next/navigation";

/** /dashboard/<id>/moderation (the sidebar link) opens the first tab. */
export default async function ModerationIndexPage({
	params,
}: {
	params: Promise<{ guildId: string }>;
}) {
	const { guildId } = await params;
	redirect(`/dashboard/${guildId}/moderation/warns`);
}
