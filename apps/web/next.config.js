const nextConfig = {
	images: {
		// Optimized by Vercel's image optimizer (/_next/image). That needs the web app deployed
		// as a regular Next.js project: when it ran as a Vercel "service", the endpoint 404'd.
		remotePatterns: [
			{
				protocol: "https",
				hostname: "cdn.discordapp.com",
			},
		],
	},
	async rewrites() {
		return [
			{
				source: "/ingest/static/:path*",
				destination: "https://us-assets.i.posthog.com/static/:path*",
			},
			{
				source: "/ingest/:path*",
				destination: "https://us.i.posthog.com/:path*",
			},
		];
	},
	// This is required to support PostHog trailing slash API requests
	skipTrailingSlashRedirect: true,
};

export default nextConfig;
