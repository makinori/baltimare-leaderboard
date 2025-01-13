import type { Metadata, Viewport } from "next";
import { snPro } from "../fonts/fonts";
import { CLOUDSDALE } from "../util";
import RootStyleRegistry from "./emotion";
import "./globals.css";

export const metadata: Metadata = {
	title: (CLOUDSDALE ? "Cloudsdale" : "Baltimare") + " Leaderboard",
	icons: [
		{
			rel: "icon",
			url: CLOUDSDALE ? "/favicon-cloudsdale.png" : "/favicon.png",
		},
	],
};

export const viewport: Viewport = {
	initialScale: 0.5,
	width: "device-width",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: JSX.Element;
}>) {
	return (
		<html lang="en">
			<body className={snPro.className}>
				<RootStyleRegistry>{children}</RootStyleRegistry>
			</body>
		</html>
	);
}
