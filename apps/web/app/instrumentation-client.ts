import posthog from "posthog-js";

console.log(
	"Initializing PostHog with key:",
	process.env.NEXT_PUBLIC_POSTHOG_KEY
);

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
	api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
	ui_host: "https://us.posthog.com",
	defaults: "2025-05-24",
	capture_exceptions: true, // enable Error Tracking
	debug: process.env.NODE_ENV !== "production",
});
