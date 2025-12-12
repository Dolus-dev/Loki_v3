/** @type {import('next').NextConfig} */
const nextConfig = {
	images: {
		remotePatterns: [new URL("https://cdn.discordapp.com/**")],
	},
};

export default nextConfig;
