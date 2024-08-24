/** @jsxImportSource @emotion/react */
"use client";

import Cron from "croner";
import { useCallback, useEffect, useMemo, useState } from "react";
import { IconType } from "react-icons";
import {
	FaFilter,
	FaGithub,
	FaRegCircle,
	FaRegCircleDot,
	FaRobot,
	FaSort,
	FaUmbrellaBeach,
} from "react-icons/fa6";
import type { IApiUser } from "../../server/api/users";
import { useSoundManager } from "../services/SoundManager";
import { FlexGrow } from "./FlexGrow";
import { HStack, VStack } from "./Stack";
import { formatMinutes, User } from "./User";
import { OnionIcon } from "./icons/OnionIcon";

enum UsersFilter {
	ShowAll = "show all",
	Online = "online",
	Offline = "offline",
}

enum UsersSort {
	TotalTime = "total time",
	SinceOnline = "since online",
}

/*
function HeaderToggleButton(props: {
	onClick: (value: boolean) => any;
	icon: IconType;
	text: string;
	value: boolean;
}) {
	return (
		<HStack
			css={{
				// marginLeft: 24,
				marginLeft: 20,
				background: props.value ? "#666" : "transparent",
				color: props.value ? "#222" : "#666",
				borderRadius: 4,
				padding: "0 4px",
				// border: "solid 2px #666",
			}}
			onClick={() => {
				props.onClick(!props.value);
			}}
		>
			<props.icon size={16} css={{ marginLeft: 0 }} />
			<span
				css={{
					fontWeight: 800,
					marginLeft: 4,
					fontSize: 16,
					cursor: "pointer",
					userSelect: "none",
				}}
			>
				{props.text}
			</span>
		</HStack>
	);
}
*/

function HeaderOptionPicker(props: {
	icon: IconType;
	text: string;
	values: string[];
	value: string;
	onClick: (value: string) => any;
}) {
	return (
		<VStack
			css={{
				alignItems: "flex-start",
				fontWeight: 700,
				fontSize: 16,
				userSelect: "none",
				opacity: 0.8,
			}}
		>
			<HStack css={{ fontWeight: 900, marginBottom: 4 }}>
				<props.icon size={16} css={{ marginRight: 4 }} />
				{props.text}
			</HStack>
			{props.values.map((value, i) => (
				<HStack
					key={i}
					onClick={() => {
						props.onClick(value);
					}}
					css={{
						opacity: value == props.value ? 0.75 : 0.5,
						cursor: "pointer",
					}}
				>
					{props.value == value ? (
						<FaRegCircleDot size={16} css={{ marginRight: 4 }} />
					) : (
						<FaRegCircle size={16} css={{ marginRight: 4 }} />
					)}
					{value}
				</HStack>
			))}
		</VStack>
	);
}

export function App(props: { data: IApiUser[] }) {
	const soundManager = useSoundManager();

	// will only run on client
	useEffect(() => {
		soundManager.init();
	}, [soundManager]);

	const [users, setUsers] = useState<IApiUser[]>(props.data);

	const [usersFilter, setUsersFilter] = useState(UsersFilter.ShowAll);
	const [usersSort, setUsersSort] = useState(UsersSort.TotalTime);
	const [showTourists, setShowTourists] = useState(false);
	const [showBots, setShowBots] = useState(false);

	const updateUsers = useCallback(async () => {
		try {
			const res = await fetch("/api/users");
			setUsers(await res.json());
		} catch (error) {}
	}, [setUsers]);

	useEffect(() => {
		// TODO: replace with web sockets

		// updateUsers(); // ssr has initial data
		// every minute, 15 seconds in
		const job = Cron("15 * * * * *", updateUsers);
		return () => {
			job.stop();
		};
	}, [updateUsers]);

	const shownUsers = useMemo(() => {
		let outputUsers: IApiUser[] = JSON.parse(JSON.stringify(users)); // deep copy

		if (!showBots) {
			outputUsers = outputUsers.filter(u => !u.traits.includes("bot"));
		}

		if (!showTourists) {
			outputUsers = outputUsers.filter(u => u.minutes > 60);
		}

		switch (usersFilter) {
			case UsersFilter.Online:
				outputUsers = outputUsers.filter(u => u.online);
				break;
			case UsersFilter.Offline:
				outputUsers = outputUsers.filter(u => !u.online);
				break;
		}

		// api should already have sorted it
		// outputUsers = outputUsers.sort((a, b) => b.minutes - a.minutes);

		if (usersSort == UsersSort.SinceOnline) {
			outputUsers = outputUsers.sort((a, b) =>
				a.online && b.online
					? 0
					: new Date(b.lastSeen).getTime() -
					  new Date(a.lastSeen).getTime(),
			);
		}

		return outputUsers;
	}, [users, usersFilter, usersSort, showTourists, showBots]);

	const highestMinutes = useMemo(() => {
		let highest = 0;
		for (const user of shownUsers) {
			if (user.minutes > highest) {
				highest = user.minutes;
			}
		}
		return highest;
	}, [shownUsers]);

	const totalMinutes = useMemo(() => {
		let total = 0;
		for (const user of shownUsers) {
			total += user.minutes;
		}
		return total;
	}, [shownUsers]);

	return (
		<HStack
			css={{
				display: "flex",
				width: "100%",
			}}
		>
			<VStack
				css={{
					width: "calc(100vw - 16px)",
					maxWidth: 800,
				}}
			>
				<a href="https://baltimare.pages.dev">
					<img
						css={{
							width: 600,
							maxWidth: "100%",
							marginTop: 32,
						}}
						src="baltimare-opg.png"
					></img>
				</a>
				<HStack
					css={{
						marginTop: 16,
						marginBottom: 8,
						width: "calc(100% - 8px)",
						justifyContent: "flex-end",
						alignItems: "flex-end",
					}}
				>
					<VStack css={{ alignItems: "flex-start" }}>
						<div
							css={{
								opacity: 0.8,
								fontSize: 20,
								fontWeight: 800,
							}}
						>
							{`${shownUsers.length} popens seen`}
							{showTourists ? (
								<span css={{ opacity: 0.4, fontSize: 16 }}>
									{" "}
									and tourists
								</span>
							) : (
								<></>
							)}
						</div>
						<div
							css={{
								opacity: 0.8,
								fontSize: 16,
								marginTop: 4,
								fontWeight: 700,
								color: "#8BC34A",
							}}
						>
							&gt; total time online since august 12th 2024
							<br />
							&gt; also how long ago since last online
							<br />
							&gt; collectively online for{" "}
							{formatMinutes(totalMinutes)} so far
						</div>
						<HStack
							css={{
								gap: 32,
								width: "100%",
								alignItems: "flex-start",
								justifyContent: "flex-start",
								marginTop: 16,
								marginBottom: 12,
							}}
						>
							<HeaderOptionPicker
								text="filter"
								icon={FaFilter}
								values={Object.values(UsersFilter)}
								value={usersFilter}
								onClick={v => {
									setUsersFilter(v as UsersFilter);
								}}
							/>
							<HeaderOptionPicker
								text="sort"
								icon={FaSort}
								values={Object.values(UsersSort)}
								value={usersSort}
								onClick={v => {
									setUsersSort(v as UsersSort);
								}}
							/>
							<HeaderOptionPicker
								text="tourists"
								icon={FaUmbrellaBeach}
								values={["hide", "show"]}
								value={showTourists ? "show" : "hide"}
								onClick={v => {
									setShowTourists(v == "show");
								}}
							/>
							<HeaderOptionPicker
								text="bots"
								icon={FaRobot}
								values={["hide", "show"]}
								value={showBots ? "show" : "hide"}
								onClick={v => {
									setShowBots(v == "show");
								}}
							/>
						</HStack>
					</VStack>
					<FlexGrow />
					<a
						css={{
							opacity: 0.4,
							marginRight: 4,
						}}
						href="https://github.com/makidoll/baltimare-leaderboard"
					>
						<FaGithub size={20} />
					</a>
					<a
						css={{
							opacity: 0.4,
							marginRight: 80,
						}}
						href="http://baltimare.hotmilkdyzrzsig55s373ruuedebeexwcgbipaemyjqnhd5wfmngjvqd.onion"
					>
						<OnionIcon size={28} color="white" />
					</a>
				</HStack>
				<div
					css={{
						display: "flex",
						flexDirection: "column",
						gap: 4,

						width: "100%",
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
				<div
					css={{
						marginTop: 16,
						marginBottom: 128,
						fontWeight: 700,
						opacity: 0.4,
					}}
				>
					there might be some users outside of baltimate that
					accidentally got logged
				</div>
				{/* <div
					css={{
						marginTop: 16,
						marginBottom: 128,
						fontWeight: 800,
						opacity: 0.4,
					}}
				>
					total hours since august 12th 2024
				</div> */}
			</VStack>
		</HStack>
	);
}
