/* eslint-disable tsdoc/syntax */
import { fileURLToPath } from 'node:url';
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
	enabled: process.env.ANALYZE === 'true',
});

/**
 * @type {import('next').NextConfig}
 */
export default withBundleAnalyzer({
	reactStrictMode: true,
	eslint: {
		ignoreDuringBuilds: true,
	},
	// Until Next.js fixes their type issues
	typescript: {
		ignoreBuildErrors: true,
	},
	cleanDistDir: true,
	outputFileTracing: true,
	experimental: {
		appDir: true,
		serverComponentsExternalPackages: ['@microsoft/api-extractor-model', 'jju', 'shiki'],
		outputFileTracingRoot: fileURLToPath(new URL('../../', import.meta.url)),
		fallbackNodePolyfills: false,
	},
	images: {
		dangerouslyAllowSVG: true,
		contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
	},
});
