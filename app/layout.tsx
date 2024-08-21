import type { Metadata, Viewport } from "next";
import RootStyleRegistry from "./emotion";
import "./fonts/sn-pro/sn-pro.css";
import "./globals.css";

export const metadata: Metadata = {
	title: "Baltimare Leaderboard",
	icons: [
		{
			rel: "icon",
			url: "/favicon.png",
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
			<body>
				<RootStyleRegistry>{children}</RootStyleRegistry>
			</body>
		</html>
	);
}
