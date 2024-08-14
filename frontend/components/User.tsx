import styled from "@emotion/styled";
import React from "react";
import type { IApiUser } from "../../server/main";
import { styleVars } from "../vars";
import { FlexGrow } from "./FlexGrow";

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
	user: IApiUser;
	highestMinutes: number;
}) {
	let name: React.JSX.Element;

	if (user.displayName == "") {
		name = <DisplayName>{user.username}</DisplayName>;
	} else {
		name = (
			<>
				<DisplayName>{user.displayName}</DisplayName>
				<Username>{user.username}</Username>
			</>
		);
	}

	const percentage = user.minutes / highestMinutes;

	return (
		<div
			css={{
				height: styleVars.userHeight,
				color: "#fff",
				fontSize: 20,
				letterSpacing: -1,
				display: "flex",
				flexDirection: "row",
				alignItems: "center",
				justifyContent: "center",
			}}
		>
			<div
				css={{
					position: "relative",
					flexGrow: 1,
					width: "100%",
					height: "100%",
					borderRadius: styleVars.userCorner,
					overflow: "hidden",
					backgroundColor: "#222",
				}}
			>
				{/* progress bar */}
				<div
					css={{
						position: "absolute",
						margin: "auto",
						top: 0,
						bottom: 0,
						// right before the border of the player icon
						left: styleVars.userHeight - styleVars.userCorner,
						borderRadius: styleVars.userCorner,
					}}
					style={{
						right: (1 - percentage) * 100 + "%",
						backgroundColor: `hsl(${i * 10}deg, 20%, 30%)`,
					}}
				></div>
				{/* content */}
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
						}}
						style={{
							backgroundImage: nullUuidRegex.test(user.imageId)
								? "url(anon-avatar.png)"
								: "url(https://picture-service.secondlife.com/" +
								  user.imageId +
								  "/256x192.jpg)",
						}}
						href={
							"https://world.secondlife.com/resident/" + user._id
						}
					></a>
					{name}
					{user.traits.includes("bot") ? (
						<div
							css={{
								padding: "0 4px",
								borderRadius: 4,
								fontSize: 12,
								fontWeight: 800,
								letterSpacing: 0,
								backgroundColor: "#333",
								color: "#888",
								textShadow: "none",
								marginLeft: styleVars.userSpacing * 1,
								opacity: 1,
							}}
						>
							bot
						</div>
					) : (
						<></>
					)}
					{user.traits.includes("anonfilly") ? (
						<a href="https://anonfilly.horse">
							<img
								src="happy-anonfilly.png"
								css={{
									height: 24,
									marginLeft: styleVars.userSpacing * 1,
									opacity: 1,
								}}
							/>
						</a>
					) : (
						<></>
					)}
					<FlexGrow />
					<div
						css={{
							marginRight: styleVars.userSpacing * 1.5,
							fontWeight: 700,
							opacity: 0.6,
							textAlign: "right",
						}}
					>
						{formatMinutes(user.minutes)}
					</div>
				</div>
			</div>
			<div
				css={{
					width: 80,
					height: "100%",
					fontSize: 16,
					fontWeight: 700,
					display: "flex",
					alignItems: "center",
					justifyContent: "flex-start",
					marginLeft: styleVars.userSpacing * 0.75,
					whiteSpace: "nowrap",
				}}
			>
				<div
					css={{
						width: 6,
						height: 24,
						borderRadius: 4,
						backgroundColor: user.online ? "#8BC34A" : "#F44336",
						marginRight: styleVars.userSpacing * 0.75,
					}}
				></div>
				<div css={{ opacity: 0.4 }}>{user.lastSeenText}</div>
			</div>
		</div>
	);
}
