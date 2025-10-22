/** @type {import('next').NextConfig} */
const siteUrl = process.env.NEXT_PUBLIC_CONVEX_URL; // ex.: https://my-app.convex.site
if (!siteUrl) throw new Error('Defina NEXT_PUBLIC_CONVEX_URL no environment');

const { hostname, protocol } = new URL(siteUrl);

const nextConfig = {
	images: {
		remotePatterns: [
			{ protocol: (protocol || 'https:').replace(':',''), hostname }, // 'https'
			{ hostname: "oaidalleapiprodscus.blob.core.windows.net" }, //oaidalleapiprodscus → conta/bucket (OpenAI + dalle + api + prod + scus = South Central US) | .blob.core.windows.net → domínio padrão dos blobs públicos da Azure.
		],
	},
};

export default nextConfig;
