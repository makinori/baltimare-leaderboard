import Cron from "croner";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FaFilter, FaGithub, FaRobot, FaSort } from "react-icons/fa6";
import type { IApiUser } from "../../server/main";
import { FlexGrow } from "./FlexGrow";
import { User } from "./User";
import { IconType } from "react-icons";

enum UsersFilter {
	Off,
	Online,
	Offline,
}

enum UsersSort {
	TotalTimeOnline,
	TimeSinceOnline,
}

function HeaderToggleButton(props: {
	onClick: () => any;
	icon: IconType;
	text: string;
}) {
	return (
		<span
			css={{
				display: "flex",
				flexDirection: "row",
				alignItems: "center",
				justifyContent: "center",
				fontWeight: 800,
				opacity: 0.4,
				marginLeft: 24,
				fontSize: 16,
				cursor: "pointer",
				userSelect: "none",
			}}
			onClick={props.onClick}
		>
			<props.icon size={16} style={{ marginRight: 4 }} />
			{props.text}
		</span>
	);
}

export function App() {
	const [users, setUsers] = useState<IApiUser[]>([]);

	const [usersFilter, setUsersFilter] = useState(UsersFilter.Off);
	const [showBots, setShowBots] = useState(true);
	const [usersSort, setUsersSort] = useState(UsersSort.TotalTimeOnline);

	const updateUsers = useCallback(async () => {
		const res = await fetch("/api/users");
		setUsers(await res.json());
	}, [setUsers]);

	useEffect(() => {
		updateUsers();
		// every minute, 30 seconds in
		const job = Cron("30 * * * * *", updateUsers);
		return () => {
			job.stop();
		};
	}, [updateUsers]);

	const toggleFilter = useCallback(() => {
		const length = Object.keys(UsersFilter).length / 2;
		setUsersFilter((usersFilter + 1) % length);
	}, [usersFilter, setUsersFilter]);

	const toggleSort = useCallback(() => {
		const length = Object.keys(UsersSort).length / 2;
		setUsersSort((usersSort + 1) % length);
	}, [usersSort, setUsersSort]);

	const shownUsers = useMemo(() => {
		let outputUsers = users;

		switch (usersFilter) {
			case UsersFilter.Online:
				outputUsers = outputUsers.filter(u => u.online);
				break;
			case UsersFilter.Offline:
				outputUsers = outputUsers.filter(u => !u.online);
				break;
		}

		if (!showBots) {
			outputUsers = outputUsers.filter(u => !u.traits.includes("bot"));
		}

		outputUsers = outputUsers.sort((a, b) => b.minutes - a.minutes);

		if (usersSort == UsersSort.TimeSinceOnline) {
			outputUsers = outputUsers.sort((a, b) =>
				a.online && b.online
					? 0
					: new Date(b.lastSeen).getTime() -
					  new Date(a.lastSeen).getTime(),
			);
		}

		return outputUsers;
	}, [users, usersFilter, showBots, usersSort]);

	const highestMinutes = useMemo(() => {
		let highest = 0;
		for (const user of shownUsers) {
			if (user.minutes > highest) {
				highest = user.minutes;
			}
		}
		return highest;
	}, [shownUsers]);

	const filterText = useMemo(() => {
		switch (usersFilter) {
			case UsersFilter.Off:
				return "no filter";
			case UsersFilter.Online:
				return "online only";
			case UsersFilter.Offline:
				return "offline only";
		}
	}, [usersFilter]);

	const sortText = useMemo(() => {
		switch (usersSort) {
			case UsersSort.TotalTimeOnline:
				return "total online";
			case UsersSort.TimeSinceOnline:
				return "since online";
		}
	}, [usersSort]);

	return (
		<>
			<a href="https://baltimare.pages.dev">
				<img
					css={{
						width: "calc(100vw - 16px)",
						maxWidth: 600,
						marginTop: 32,
					}}
					src="baltimare-opg.png"
				></img>
			</a>
			<div
				css={{
					marginTop: 16,
					marginBottom: 4,
					fontWeight: 800,
					fontSize: 20,
					display: "flex",
					width: "calc(100vw - 16px - 8px)",
					maxWidth: 800 - 8,
					flexDirection: "row",
					alignItems: "flex-end", // move to bottom
					justifyContent: "center",
				}}
			>
				<span css={{ opacity: 0.6 }}>{`${users.length} popens`}</span>
				<span css={{ opacity: 0.2, fontSize: 16 }}>/tourists</span>
				<HeaderToggleButton
					onClick={toggleFilter}
					icon={FaFilter}
					text={filterText}
				/>
				<HeaderToggleButton
					onClick={() => {
						setShowBots(!showBots);
					}}
					icon={FaRobot}
					text={showBots ? "with bots" : "no bots"}
				/>
				<HeaderToggleButton
					onClick={toggleSort}
					icon={FaSort}
					text={sortText}
				/>
				<FlexGrow />
				<a
					css={{
						// display: "flex",
						// flexDirection: "row",
						// alignItems: "center",
						// justifyContent: "center",
						// fontWeight: 800,
						// fontSize: 16,
						opacity: 0.4,
						marginRight: 80,
						alignSelf: "center",
					}}
					href="https://github.com/makidoll/baltimare-leaderboard"
				>
					<FaGithub size={20} />
				</a>
			</div>
			<div
				css={{
					display: "flex",
					flexDirection: "column",
					gap: 4,
					width: "calc(100vw - 16px)",
					maxWidth: 800,
					marginBottom: 32,
				}}
			>
				{shownUsers.map((user, i) => (
					<User
						key={i}
						i={i}
						user={user}
						highestMinutes={highestMinutes}
					/>
				))}
			</div>
		</>
	);
}
