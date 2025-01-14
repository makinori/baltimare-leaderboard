import { dirname } from "path";
import { fileURLToPath } from "url";

/** @type {import('next').NextConfig} */
const nextConfig = {
	// https://stackoverflow.com/questions/60618844/react-hooks-useeffect-is-called-twice-even-if-an-empty-array-is-used-as-an-ar
	// wasnt rerendering when necessary
	reactStrictMode: true,
	compress: true,
	images: {
		remotePatterns: [
			{ protocol: "https", hostname: "picture-service.secondlife.com" },
		],
	},
	// env: {
	// 	APP_ROOT: dirname(fileURLToPath(import.meta.url)),
	// },
	i18n: {
		locales: ["en"],
		defaultLocale: "en",
	},
	experimental: {
		reactCompiler: true,
	},
};

export default nextConfig;
