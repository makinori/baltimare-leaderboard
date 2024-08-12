import { formatDistanceToNow } from "date-fns";
import React from "react";
import type { IUser } from "../../server/users";

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
				<div className="display-name">{displayName}</div>
				<div className="username">{usernameMatches[1]}</div>
			</>
		);
	} else {
		name = <div className="display-name">{user.name}</div>;
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
		<div className="user">
			<div
				className="bar"
				style={{
					right: (1 - percentage) * 100 + "%",
					backgroundColor: `hsl(${i * 10}deg, 20%, 30%)`,
				}}
			></div>
			<div className="info">
				<a
					className="avatar"
					href={"https://world.secondlife.com/resident/" + user._id}
					style={{
						backgroundImage: nullUuidRegex.test(user.imageId)
							? ""
							: "url(https://picture-service.secondlife.com/" +
							  user.imageId +
							  "/256x192.jpg)",
					}}
				></a>
				{name}
				<div className="flex-grow"></div>
				<div className="seen">{lastSeenText}</div>
				<div className="time">{formatMinutes(user.minutes)}</div>
			</div>
		</div>
	);
}
