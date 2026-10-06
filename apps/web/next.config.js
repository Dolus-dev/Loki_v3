const nextConfig = {
	images: {
		// Load images straight from their files instead of through Next's image optimizer
		// (/_next/image): on the Vercel deployment, which runs the web app as a service, that
		// endpoint returns 404, so every <Image> broke. Images are sized at the source instead
		// (e.g. public/logo-512.png), and Discord's CDN resizes its own via ?size=.
		unoptimized: true,
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
