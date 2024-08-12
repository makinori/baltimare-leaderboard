import styled from "@emotion/styled";
import { formatDistanceToNow } from "date-fns";
import React from "react";
import type { IUser } from "../../server/users";
import { styleVars } from "../vars";
import { FlexGrow } from "./FlexGrow";

const usernameRegex = / \(([^(]+?)\)$/;

const nullUuidRegex = /^0{8}-0{4}-0{4}-0{4}-0{12}$/;

function addSeperators(n: number) {
	let out: string[] = [];
	const chars = Math.floor(n).toString().split("").reverse();

	for (let i = 0; i < chars.length; i += 3) {
		if (i != 0) out = [...out, ","];
		out = [...out, ...chars.slice(i, i + 3)];
	}

	return out.reverse().join("");
}

function formatMinutes(m: number) {
	if (m < 60) return `${m}m`;
	const h = Math.floor(m / 60);
	return `${addSeperators(h)}h ${m % 60}m`;
}

const DisplayName = styled.div({
	marginLeft: styleVars.userSpacing,
	fontWeight: 800,
	opacity: 0.9,
});

const Username = styled.div({
	marginLeft: styleVars.userSpacing,
	fontSize: 16,
	fontWeight: 700,
	opacity: 0.4,
});

export function User({
	i,
	user,
	highestMinutes,
}: {
	i: number;
	user: IUser;
	highestMinutes: number;
}) {
	let name: React.JSX.Element;

	const usernameMatches = user.name.match(usernameRegex);
	if (usernameMatches != null) {
		const displayName = user.name.replace(usernameRegex, "").trim();

		name = (
			<>
				<DisplayName>{displayName}</DisplayName>
				<Username>{usernameMatches[1]}</Username>
			</>
		);
	} else {
		name = <DisplayName>{user.name}</DisplayName>;
	}

	const percentage = user.minutes / highestMinutes;

	const lastSeen = new Date(user.lastSeen);
	const lastSeenSeconds = (Date.now() - lastSeen.getTime()) / 1000;
	const seenRecently = lastSeenSeconds < 60 * 2; // within 2 minutes

	let lastSeenText = "online";
	if (!seenRecently) {
		lastSeenText = formatDistanceToNow(lastSeen, {
			addSuffix: true,
		})
			.replace("about", "")
			.trim();
	}

	return (
		<div
			css={{
				height: styleVars.userHeight,
				backgroundColor: "#222",
				borderRadius: styleVars.userCorner,
				overflow: "hidden",
				color: "#fff",
				fontSize: 20,
				letterSpacing: -1,
				position: "relative",
			}}
		>
			<div
				css={{
					position: "absolute",
					margin: "auto",
					top: 0,
					bottom: 0,
					left: styleVars.userHeight - styleVars.userCorner,
					borderRadius: styleVars.userCorner,
					// dynamic
					right: (1 - percentage) * 100 + "%",
					backgroundColor: `hsl(${i * 10}deg, 20%, 30%)`,
				}}
			></div>
			<div
				css={{
					position: "absolute",
					margin: "auto",
					top: 0,
					right: 0,
					bottom: 0,
					left: 0,
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
					textShadow: "2px 2px 0px rgba(17, 17, 17, 0.4)",
				}}
			>
				<a
					css={{
						width: styleVars.userHeight,
						height: styleVars.userHeight,
						borderRadius: `0 ${styleVars.userCorner}px ${styleVars.userCorner}px 0`,
						backgroundColor: "#333",
						backgroundSize: "100% 100%",
						// dynamic
						backgroundImage: nullUuidRegex.test(user.imageId)
							? "url(anon-avatar.png)"
							: "url(https://picture-service.secondlife.com/" +
							  user.imageId +
							  "/256x192.jpg)",
					}}
					href={"https://world.secondlife.com/resident/" + user._id}
				></a>
				{name}
				<FlexGrow />
				<div
					css={{
						marginRight: styleVars.userSpacing * 1.5,
						fontSize: 16,
						fontWeight: 700,
						opacity: 0.4,
					}}
				>
					{lastSeenText}
				</div>
				<div
					css={{
						marginRight: styleVars.userSpacing * 1.5,
						fontWeight: 700,
						opacity: 0.6,
					}}
				>
					{formatMinutes(user.minutes)}
				</div>
			</div>
		</div>
	);
}
